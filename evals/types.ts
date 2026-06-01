import type { ScoreReport } from "./scorer.js";
import type { ReviewResult } from "../src/lib/ai/review-prompt.js";
import type { CaseScore } from "./scorer.js";

export type CaseResult = {
  caseId: string;
  category: string;
  result: ReviewResult;
  score: CaseScore;
};

export type EvalReport = {
  timestamp: string;
  gitSha: string;
  model: string;
  promptVersion: string;
  scores: ScoreReport;
  cases: CaseResult[];
};
