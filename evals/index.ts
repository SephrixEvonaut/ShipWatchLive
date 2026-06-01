import { run } from "./runner.js";
import { writeReport, loadBaseline, printMarkdownTable } from "./report.js";

async function main() {
  const { cases, scores } = await run();
  const reportPath = await writeReport(cases, scores);
  const baseline = await loadBaseline();

  // Reconstruct report shape for the table printer
  const { EVAL_MODEL } = await import("../src/lib/ai/models.js");
  const { REVIEW_PROMPT_VERSION } = await import("../src/lib/ai/review-prompt.js");
  const { execSync } = await import("child_process");

  const gitSha = (() => {
    try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
    catch { return "unknown"; }
  })();

  printMarkdownTable(
    {
      timestamp: new Date().toISOString(),
      gitSha,
      model: process.env.EVAL_MODEL ?? EVAL_MODEL,
      promptVersion: REVIEW_PROMPT_VERSION,
      scores,
      cases,
    },
    baseline
  );

  console.log(`\nReport written to: ${reportPath}`);
  console.log("To set as baseline: cp <report-path> evals/results/baseline.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
