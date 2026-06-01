import type { ReviewResult } from "../../src/lib/ai/review-prompt.js";

// Validates the live n8n path on demand.
// Set EVAL_SUT=webhook to use this adapter.
export async function reviewDiff(params: {
  diff: string;
  fileContents?: string;
  repository?: string;
  commitSha?: string;
  commitMessage?: string;
}): Promise<ReviewResult> {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) throw new Error("N8N_WEBHOOK_URL is not set");

  const res = await fetch(n8nUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repository: params.repository ?? "eval/test-repo",
      commitSha: params.commitSha ?? "eval0000000",
      commitMessage: params.commitMessage ?? "eval: test case",
      diff: params.diff,
      fileContents: params.fileContents ?? "",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`n8n returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const rawText = await res.text();

  function tryParseObject(s: string): Record<string, unknown> | null {
    try {
      const p = JSON.parse(s.trim());
      if (p !== null && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {}
    return null;
  }

  function unwrap(obj: Record<string, unknown>): ReviewResult {
    if (typeof obj.summary === "string") {
      return { summary: obj.summary, fixes: Array.isArray(obj.fixes) ? obj.fixes : [] };
    }
    if (Array.isArray(obj.content)) {
      const block = (obj.content as Record<string, unknown>[])[0];
      if (block?.type === "text" && typeof block.text === "string") {
        const inner = tryParseObject(block.text as string);
        if (inner) return unwrap(inner);
        return { summary: block.text as string, fixes: [] };
      }
    }
    return { summary: JSON.stringify(obj), fixes: [] };
  }

  try {
    const parsed = JSON.parse(rawText.trim());
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return unwrap(parsed as Record<string, unknown>);
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (first !== null && typeof first === "object") {
        return unwrap(first as Record<string, unknown>);
      }
    }
  } catch {}

  return { summary: rawText, fixes: [] };
}
