import { writeFile, readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { EVAL_MODEL } from "../src/lib/ai/models.js";
import { REVIEW_PROMPT_VERSION } from "../src/lib/ai/review-prompt.js";
import type { CaseResult, EvalReport } from "./types.js";
import type { ScoreReport } from "./scorer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, "results");
const BASELINE_PATH = join(RESULTS_DIR, "baseline.json");

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export async function writeReport(
  cases: CaseResult[],
  scores: ScoreReport
): Promise<string> {
  const model = process.env.EVAL_MODEL ?? EVAL_MODEL;
  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    gitSha: gitSha(),
    model,
    promptVersion: REVIEW_PROMPT_VERSION,
    scores,
    cases,
  };

  const filename = `${report.timestamp.replace(/[:.]/g, "-")}-${report.gitSha}-${model.replace(/[^a-z0-9]/gi, "_")}-v${REVIEW_PROMPT_VERSION}.json`;
  const outPath = join(RESULTS_DIR, filename);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf-8");
  return outPath;
}

export async function loadBaseline(): Promise<EvalReport | null> {
  try {
    const raw = await readFile(BASELINE_PATH, "utf-8");
    return JSON.parse(raw) as EvalReport;
  } catch {
    return null;
  }
}

export async function loadNewestReport(): Promise<EvalReport | null> {
  try {
    const files = (await readdir(RESULTS_DIR))
      .filter((f) => f.endsWith(".json") && f !== "baseline.json")
      .sort();
    if (files.length === 0) return null;
    const raw = await readFile(join(RESULTS_DIR, files[files.length - 1]), "utf-8");
    return JSON.parse(raw) as EvalReport;
  } catch {
    return null;
  }
}

export function printMarkdownTable(report: EvalReport, baseline: EvalReport | null): void {
  const { scores } = report;
  const categories = Object.keys(scores.byCategory).sort();

  console.log(`\n## Eval Report`);
  console.log(`- **Model:** ${report.model}`);
  console.log(`- **Prompt version:** ${report.promptVersion}`);
  console.log(`- **Commit:** ${report.gitSha}`);
  console.log(`- **Timestamp:** ${report.timestamp}`);
  console.log();

  const header = "| Category | Recall | Noise | Matched/Total | vs Baseline |";
  const sep    = "|----------|--------|-------|---------------|-------------|";
  console.log(header);
  console.log(sep);

  for (const cat of categories) {
    const s = scores.byCategory[cat];
    const recall = (s.recall * 100).toFixed(0) + "%";
    const noise  = (s.noise  * 100).toFixed(0) + "%";
    const ratio  = `${s.matched}/${s.total}`;

    let delta = "—";
    if (baseline) {
      const base = baseline.scores.byCategory[cat];
      if (base) {
        const diff = s.recall - base.recall;
        const sign = diff >= 0 ? "▲ +" : "▼ ";
        delta = `${sign}${(Math.abs(diff) * 100).toFixed(0)}%`;
      }
    }
    console.log(`| ${cat} | ${recall} | ${noise} | ${ratio} | ${delta} |`);
  }

  const overallDelta = baseline
    ? (() => {
        const diff = scores.overall.recall - baseline.scores.overall.recall;
        return (diff >= 0 ? "▲ +" : "▼ ") + (Math.abs(diff) * 100).toFixed(0) + "%";
      })()
    : "—";

  console.log(sep);
  console.log(`| **Overall** | **${(scores.overall.recall * 100).toFixed(0)}%** | **${(scores.overall.noise * 100).toFixed(0)}%** | — | ${overallDelta} |`);
  console.log();

  if (baseline) {
    const regressions = categories.filter((cat) => {
      const base = baseline.scores.byCategory[cat];
      return base && scores.byCategory[cat].recall < base.recall - 0.1;
    });
    if (regressions.length > 0) {
      console.log(`⚠️  Recall regression > 10pp in: ${regressions.join(", ")}`);
    } else {
      console.log("✅  No category regressions vs baseline.");
    }
  } else {
    console.log("ℹ️  No baseline found — copy this report to evals/results/baseline.json to enable regression tracking.");
  }
}
