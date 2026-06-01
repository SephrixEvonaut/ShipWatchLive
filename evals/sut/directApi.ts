import Anthropic from "@anthropic-ai/sdk";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserMessage, type ReviewResult } from "../../src/lib/ai/review-prompt.js";
import { EVAL_MODEL } from "../../src/lib/ai/models.js";

const client = new Anthropic();

// temperature=0 is valid on Haiku 4.5 and Opus 4.6.
// If EVAL_MODEL is overridden to Opus 4.7/4.8, remove temperature (removed on those models).
const MODEL = process.env.EVAL_MODEL ?? EVAL_MODEL;

export async function reviewDiff(params: {
  diff: string;
  fileContents?: string;
  repository?: string;
  commitSha?: string;
  commitMessage?: string;
}): Promise<ReviewResult> {
  const userMessage = buildReviewUserMessage({
    repository: params.repository ?? "eval/test-repo",
    commitSha: params.commitSha ?? "eval0000000",
    commitMessage: params.commitMessage ?? "eval: test case",
    diff: params.diff,
    fileContents: params.fileContents ?? "",
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0,
    // Cache the large static system prompt across all eval cases in one run.
    // Minimum cacheable prefix is 4096 tokens on Haiku 4.5 — the review prompt
    // is ~200 lines and should hit that threshold.
    system: [
      {
        type: "text",
        text: REVIEW_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in response");
  }

  try {
    const parsed = JSON.parse(textBlock.text.trim());
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : JSON.stringify(parsed),
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    };
  } catch {
    return { summary: textBlock.text, fixes: [] };
  }
}
