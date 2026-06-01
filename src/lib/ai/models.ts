// Model IDs used across the AI pipeline.
// Production nodes run claude-opus-4-6 (as configured in n8n).
// Evals default to Haiku for cheap CI runs; override with EVAL_MODEL env var.

export const PRODUCTION_MODEL = "claude-opus-4-6";
export const EVAL_MODEL = process.env.EVAL_MODEL ?? "claude-haiku-4-5-20251001";
