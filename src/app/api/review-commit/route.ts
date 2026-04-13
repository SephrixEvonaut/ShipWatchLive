import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repository, commitSha } = await request.json();

  if (!repository || !commitSha) {
    return NextResponse.json(
      { error: "Missing repository or commitSha" },
      { status: 400 },
    );
  }

  // Get the user's GitHub installation to fetch a token
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

  // Get an installation access token
  const { token } = await getInstallationToken(installation.installation_id);
  if (!token) {
    return NextResponse.json(
      { error: "Failed to get GitHub token" },
      { status: 500 },
    );
  }

  // Fetch the commit diff from GitHub
  const diffRes = await fetch(
    `https://api.github.com/repos/${repository}/commits/${commitSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.diff",
      },
    },
  );

  if (!diffRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch commit diff from GitHub" },
      { status: 502 },
    );
  }

  const diff = await diffRes.text();

  // Also fetch commit metadata for context
  const metaRes = await fetch(
    `https://api.github.com/repos/${repository}/commits/${commitSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  let commitMessage = "";
  let changedFiles: { filename: string }[] = [];
  if (metaRes.ok) {
    const meta = await metaRes.json();
    commitMessage = meta.commit?.message ?? "";
    changedFiles = meta.files ?? [];
  }

  // Fetch full content of each changed file at this commit (cap at 15 files)
  const fileContents: Record<string, string> = {};

  const sortedFiles = [...changedFiles].sort((a, b) => {
    const aChanges = (a as any).changes ?? 0;
    const bChanges = (b as any).changes ?? 0;
    return bChanges - aChanges;
  });

  await Promise.all(
    sortedFiles.slice(0, 15).map(async (f) => {
      const contentRes = await fetch(
        `https://api.github.com/repos/${repository}/contents/${f.filename}?ref=${commitSha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (!contentRes.ok) return;
      const data = await contentRes.json();
      if (data.encoding === "base64" && typeof data.content === "string") {
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        if (decoded.length <= 120_000) {
          fileContents[f.filename] = decoded;
        } else {
          const head = decoded.slice(0, 60_000);
          const tail = decoded.slice(-20_000);
          fileContents[f.filename] =
            head +
            "\n\n// ... [FILE TRUNCATED - " +
            decoded.length.toLocaleString() +
            " chars total, middle section omitted for size] ...\n\n" +
            tail;
        }
      }
    }),
  );

  // Forward to n8n webhook
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL not configured" },
      { status: 500 },
    );
  }

  const n8nRes = await fetch(n8nUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repository,
      commitSha,
      commitMessage,
      diff: diff.slice(0, 150_000),
      fileContents: JSON.stringify(fileContents),
    }),
  });

  if (!n8nRes.ok) {
    const errorBody = await n8nRes.text().catch(() => "");
    console.error(
      `n8n error: status=${n8nRes.status} body=${errorBody.slice(0, 500)}`,
    );
    return NextResponse.json(
      {
        error: `n8n workflow failed (${n8nRes.status})`,
        detail: errorBody.slice(0, 200),
      },
      { status: 502 },
    );
  }

  // n8n may return JSON with any content-type — always try to parse as JSON first.
  // Handle three possible shapes:
  //   1. Direct object:  { summary, fixes }
  //   2. n8n array wrap: [{ content: [{ type: "text", text: "{\"summary\"...}" }] }]
  //      where .text is itself a JSON string that must be parsed a second time
  //   3. Plain text fallback
  const rawText = await n8nRes.text();
  let analysis: Record<string, unknown>;

  function tryParseObject(s: string): Record<string, unknown> | null {
    try {
      const p = JSON.parse(s.trim());
      if (p !== null && typeof p === "object" && !Array.isArray(p))
        return p as Record<string, unknown>;
    } catch {}
    return null;
  }

  try {
    const parsed = JSON.parse(rawText.trim());

    // Unwrap n8n/OpenAI message envelope shapes before treating as final analysis.
    // n8n can return:
    //   Shape A: { content: [{ type: "text", text: "{\"summary\"...}" }] }  — direct object
    //   Shape B: [{ content: [{ type: "text", text: "{\"summary\"...}" }] }] — array wrap
    //   Shape C: { summary, fixes }  — already the final analysis object
    function unwrapBlock(obj: Record<string, unknown>): Record<string, unknown> {
      if (Array.isArray(obj.content)) {
        const block = (obj.content as Record<string, unknown>[])[0];
        if (block?.type === "text" && typeof block.text === "string") {
          return tryParseObject(block.text) ?? { summary: block.text as string };
        }
      }
      return obj;
    }

    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      analysis = unwrapBlock(parsed as Record<string, unknown>);
    } else if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (first !== null && typeof first === "object") {
        analysis = unwrapBlock(first as Record<string, unknown>);
      } else {
        analysis = { summary: rawText };
      }
    } else {
      analysis = { summary: rawText };
    }
  } catch {
    analysis = { summary: rawText };
  }


  return NextResponse.json({ analysis });
}

// --- GitHub App helpers ---

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
