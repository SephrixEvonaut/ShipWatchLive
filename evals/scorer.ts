import Anthropic from "@anthropic-ai/sdk";
import { EVAL_MODEL } from "../src/lib/ai/models.js";
import type { ReviewResult } from "../src/lib/ai/review-prompt.js";

const client = new Anthropic();
const MODEL = process.env.EVAL_MODEL ?? EVAL_MODEL;

export type ExpectedFinding = {
  id: string;
  category: string;
  summary: string;
  lineHint: number | null;
  severity: "low" | "medium" | "high";
};

export type FindingMatch = {
  findingId: string;
  matched: boolean;
  judgeReason?: string;
};

export type CategoryScore = {
  recall: number;
  noise: number;
  matched: number;
  total: number;
  noiseCount: number;
};

export type ScoreReport = {
  overall: { recall: number; noise: number };
  byCategory: Record<string, CategoryScore>;
};

async function judgeMatch(
  reviewText: string,
  finding: ExpectedFinding
): Promise<boolean> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8,
    temperature: 0,
    system: "You are an objective evaluator. Answer with exactly one word: YES or NO.",
    messages: [
      {
        role: "user",
        content: `Code review text:\n${reviewText.slice(0, 8000)}\n\nIssue to check for:\n- Category: ${finding.category}\n- Description: ${finding.summary}\n- Severity: ${finding.severity}\n\nDid the review identify this issue or a closely equivalent one? Answer YES or NO only.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return false;
  return textBlock.text.trim().toUpperCase().startsWith("YES");
}

async function isNoise(
  reviewText: string,
  fix: { filename: string; issue: string },
  expectedFindings: ExpectedFinding[]
): Promise<boolean> {
  if (expectedFindings.length === 0) return true;

  const expectedSummary = expectedFindings.map((f, i) => `${i + 1}. ${f.summary}`).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8,
    temperature: 0,
    system: "You are an objective evaluator. Answer with exactly one word: YES or NO.",
    messages: [
      {
        role: "user",
        content: `A code reviewer flagged this issue:\nFile: ${fix.filename}\nIssue: ${fix.issue}\n\nKnown expected issues in this code:\n${expectedSummary}\n\nDoes the flagged issue closely match any of the expected issues? Answer YES or NO only.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return true;
  // noise = does NOT match any expected finding
  return !textBlock.text.trim().toUpperCase().startsWith("YES");
}

export type CaseScore = {
  caseId: string;
  category: string;
  matches: FindingMatch[];
  recall: number;
  noiseCount: number;
};

export async function scoreCase(
  caseId: string,
  category: string,
  result: ReviewResult,
  expectedFindings: ExpectedFinding[]
): Promise<CaseScore> {
  const reviewText = result.summary + "\n" + result.fixes.map((f) => `${f.filename}: ${f.issue}`).join("\n");

  // Recall: for each expected finding, ask judge if review identified it
  const matchPromises = expectedFindings.map(async (f): Promise<FindingMatch> => {
    const matched = await judgeMatch(reviewText, f);
    return { findingId: f.id, matched };
  });

  // Noise: for each actual fix, check if it matches any expected finding
  const noisePromises = result.fixes.map((fix) => isNoise(reviewText, fix, expectedFindings));

  const [matches, noiseResults] = await Promise.all([
    Promise.all(matchPromises),
    Promise.all(noisePromises),
  ]);

  const matched = matches.filter((m) => m.matched).length;
  const noiseCount = noiseResults.filter(Boolean).length;
  const recall = expectedFindings.length > 0 ? matched / expectedFindings.length : 1;

  return { caseId, category, matches, recall, noiseCount };
}

export function aggregateScores(caseScores: CaseScore[]): ScoreReport {
  const byCategory: Record<string, { matched: number; total: number; noiseCount: number }> = {};

  for (const cs of caseScores) {
    if (!byCategory[cs.category]) {
      byCategory[cs.category] = { matched: 0, total: 0, noiseCount: 0 };
    }
    const cat = byCategory[cs.category];
    cat.matched += cs.matches.filter((m) => m.matched).length;
    cat.total += cs.matches.length;
    cat.noiseCount += cs.noiseCount;
  }

  const categoryScores: Record<string, CategoryScore> = {};
  let totalMatched = 0;
  let totalExpected = 0;
  let totalNoise = 0;

  for (const [cat, stats] of Object.entries(byCategory)) {
    const recall = stats.total > 0 ? stats.matched / stats.total : 1;
    // noise is a ratio of flagged-but-unexpected vs total flagged — proxy only,
    // true precision requires exhaustively labelled cases
    const totalFlagged = caseScores
      .filter((c) => c.category === cat)
      .reduce((sum, c) => sum + c.noiseCount + c.matches.filter((m) => m.matched).length, 0);
    const noise = totalFlagged > 0 ? stats.noiseCount / totalFlagged : 0;

    categoryScores[cat] = { recall, noise, matched: stats.matched, total: stats.total, noiseCount: stats.noiseCount };
    totalMatched += stats.matched;
    totalExpected += stats.total;
    totalNoise += stats.noiseCount;
  }

  const overallRecall = totalExpected > 0 ? totalMatched / totalExpected : 1;
  const totalFlagged = totalMatched + totalNoise;
  const overallNoise = totalFlagged > 0 ? totalNoise / totalFlagged : 0;

  return { overall: { recall: overallRecall, noise: overallNoise }, byCategory: categoryScores };
}
