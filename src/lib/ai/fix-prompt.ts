// Single source of truth for the auto-fix system prompt.
// This is the exact prompt used in the n8n "Fix" Claude node.
// The dynamic section (filename, issue, fileContent) is separated into
// buildFixUserMessage() so the Claude API system/user split is clean.

export const FIX_SYSTEM_PROMPT = `You are a senior software engineer applying a targeted bug fix.

Fix ONLY the described issue. Do not refactor, reformat, or touch anything else.

Respond with a single raw JSON object — no markdown fences, no text before or after:

{"correctedContent":"<complete corrected file content>"}

correctedContent must be the COMPLETE file. Never truncate it.`;

export interface FixUserMessageParams {
  filename: string;
  issue: string;
  fileContent: string;
}

export function buildFixUserMessage(params: FixUserMessageParams): string {
  return `filename: ${params.filename}

issue: ${params.issue}

fileContent:
${params.fileContent}`;
}

export interface FixResult {
  correctedContent: string;
}
