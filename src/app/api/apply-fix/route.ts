import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repository, branch, filename, issue } = await request.json();

  if (!repository || !branch || !filename || !issue) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const fixWebhookUrl = process.env.N8N_FIX_WEBHOOK_URL;
  if (!fixWebhookUrl) {
    return NextResponse.json(
      { error: "N8N_FIX_WEBHOOK_URL not configured" },
      { status: 500 },
    );
  }

  const { data: installation } = await supabase
    .from("github_installations")
    .select("installation_id")
    .eq("user_id", user.id)
    .single();

  if (!installation) {
    return NextResponse.json(
      { error: "No GitHub installation found" },
      { status: 404 },
    );
  }

  const { token } = await getInstallationToken(installation.installation_id);
  if (!token) {
    return NextResponse.json(
      { error: "Failed to get GitHub token" },
      { status: 500 },
    );
  }

  // Step 1 — fetch current file content + SHA from GitHub
  const fileRes = await fetch(
    `https://api.github.com/repos/${repository}/contents/${filename}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!fileRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch file from GitHub" },
      { status: 502 },
    );
  }

  const fileData = await fileRes.json();
  if (fileData.encoding !== "base64" || typeof fileData.content !== "string") {
    return NextResponse.json(
      { error: "Unexpected file encoding from GitHub" },
      { status: 502 },
    );
  }

  const fileContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fileSha = fileData.sha as string;

  // Step 2 — send file + issue to AI via n8n fix webhook
  const n8nRes = await fetch(fixWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repository, branch, filename, fileContent, issue }),
  });

  if (!n8nRes.ok) {
    const err = await n8nRes.text().catch(() => "");
    return NextResponse.json(
      { error: `AI fix workflow failed (${n8nRes.status})`, detail: err.slice(0, 200) },
      { status: 502 },
    );
  }

  // Step 3 — parse corrected content from n8n response.
  // n8n wraps AI output in a message envelope. Unwrap all known shapes:
  //   a) { correctedContent: "..." }                      — direct object
  //   b) { content: [{ type: "text", text: "{...}" }] }  — message object
  //   c) [{ content: [{ type: "text", text: "{...}" }] }]— array of messages
  const rawText = await n8nRes.text();
  let correctedContent: string | null = null;

  function extractCorrectedContent(obj: Record<string, unknown>): string | null {
    return typeof obj.correctedContent === "string" ? obj.correctedContent : null;
  }

  function unwrapMessage(obj: Record<string, unknown>): string | null {
    const direct = extractCorrectedContent(obj);
    if (direct) return direct;

    if (Array.isArray(obj.content)) {
      const block = (obj.content as Record<string, unknown>[])[0];
      if (block?.type === "text" && typeof block.text === "string") {
        const text = (block.text as string).trim();
        try {
          const inner = JSON.parse(text);
          if (inner !== null && typeof inner === "object") {
            return extractCorrectedContent(inner as Record<string, unknown>);
          }
        } catch {
          // JSON.parse failed — AI may have prepended prose before the JSON.
          const jsonStart = text.indexOf('{"correctedContent"');
          if (jsonStart !== -1) {
            try {
              const inner = JSON.parse(text.slice(jsonStart));
              if (inner !== null && typeof inner === "object") {
                return extractCorrectedContent(inner as Record<string, unknown>);
              }
            } catch {}
          }
        }
        return null;
      }
    }
    return null;
  }

  try {
    const parsed = JSON.parse(rawText.trim());

    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      correctedContent = unwrapMessage(parsed as Record<string, unknown>);
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (first !== null && typeof first === "object") {
        correctedContent = unwrapMessage(first as Record<string, unknown>);
      }
    }
  } catch {
    // Top-level parse failed — try to extract JSON from mixed content
    const trimmed = rawText.trim();
    const jsonStart = trimmed.indexOf('{"correctedContent"');
    if (jsonStart !== -1) {
      try {
        const inner = JSON.parse(trimmed.slice(jsonStart));
        if (inner !== null && typeof inner === "object") {
          correctedContent = extractCorrectedContent(inner as Record<string, unknown>);
        }
      } catch {}
    }
  }

  if (!correctedContent) {
    return NextResponse.json(
      { error: "AI did not return corrected file content" },
      { status: 502 },
    );
  }

  // If the content was double-encoded (literal \n instead of real newlines),
  // unescape it before committing so the file isn't written as one long line.
  if (!correctedContent.includes("\n") && correctedContent.includes("\\n")) {
    correctedContent = correctedContent
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  // Step 4 — commit the corrected file to GitHub
  const commitRes = await fetch(
    `https://api.github.com/repos/${repository}/contents/${filename}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `fix: AI-suggested corrections in ${filename} via ShipWatch`,
        content: Buffer.from(correctedContent).toString("base64"),
        sha: fileSha,
        branch,
      }),
    },
  );

  if (!commitRes.ok) {
    const err = await commitRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to commit fix", detail: err.slice(0, 200) },
      { status: 502 },
    );
  }

  const commitData = await commitRes.json();
  return NextResponse.json({
    commitSha: commitData.commit?.sha,
    commitUrl: commitData.commit?.html_url,
  });
}

async function getInstallationToken(installationId: number) {
  const jwt = await generateJWT();
  if (!jwt) return { token: null };

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) return { token: null };
  const data = await res.json();
  return { token: data.token as string };
}

async function generateJWT(): Promise<string | null> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKeyRaw) return null;

  const privateKeyPem = privateKeyRaw.startsWith("-----BEGIN")
    ? privateKeyRaw
    : Buffer.from(privateKeyRaw, "base64").toString("utf-8");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsigned = `${encode(header)}.${encode(payload)}`;

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(privateKeyPem, "base64url");

  return `${unsigned}.${signature}`;
}
