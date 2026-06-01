import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scoreCase, aggregateScores, type ScoreReport } from "./scorer.js";
import type { CaseResult } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type EvalCase = {
  id: string;
  category: string;
  language: string;
  diff: string;
  fileContents?: string;
  expectedFindings: {
    id: string;
    category: string;
    summary: string;
    lineHint: number | null;
    severity: "low" | "medium" | "high";
  }[];
};

async function loadCases(): Promise<EvalCase[]> {
  const casesDir = join(__dirname, "cases");
  const files = (await readdir(casesDir)).filter((f) => f.endsWith(".json"));
  const cases = await Promise.all(
    files.map(async (f) => {
      const raw = await readFile(join(casesDir, f), "utf-8");
      return JSON.parse(raw) as EvalCase;
    })
  );
  return cases.sort((a, b) => a.id.localeCompare(b.id));
}

async function loadSut() {
  const sut = process.env.EVAL_SUT ?? "direct";
  if (sut === "webhook") {
    const mod = await import("./sut/webhook.js");
    return mod.reviewDiff;
  }
  const mod = await import("./sut/directApi.js");
  return mod.reviewDiff;
}

export async function run(): Promise<{ cases: CaseResult[]; scores: ScoreReport }> {
  const [cases, reviewDiff] = await Promise.all([loadCases(), loadSut()]);

  console.log(`Running ${cases.length} cases via ${process.env.EVAL_SUT ?? "direct"} SUT...`);

  // Run cases sequentially to avoid rate limit bursts
  const caseResults: CaseResult[] = [];
  for (const c of cases) {
    process.stdout.write(`  ${c.id}... `);
    const result = await reviewDiff({
      diff: c.diff,
      fileContents: c.fileContents,
      repository: "eval/test-repo",
      commitSha: `eval-${c.id}`,
      commitMessage: `eval: ${c.id}`,
    });
    const score = await scoreCase(c.id, c.category, result, c.expectedFindings);
    caseResults.push({ caseId: c.id, category: c.category, result, score });
    console.log(`recall=${score.recall.toFixed(2)} noise=${score.noiseCount}`);
  }

  const scores = aggregateScores(caseResults.map((r) => r.score));
  return { cases: caseResults, scores };
}
