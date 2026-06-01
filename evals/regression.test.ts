import { describe, it, expect } from "vitest";
import { loadNewestReport, loadBaseline } from "./report.js";

const RECALL_THRESHOLD = parseFloat(process.env.EVAL_RECALL_THRESHOLD ?? "0.7");
const MAX_REGRESSION = 0.1;

describe("eval regression", () => {
  it("newest report exists", async () => {
    const report = await loadNewestReport();
    expect(report, "No eval report found — run `npm run eval` first").not.toBeNull();
  });

  it(`overall recall >= ${RECALL_THRESHOLD}`, async () => {
    const report = await loadNewestReport();
    if (!report) return; // previous test already failed

    const recall = report.scores.overall.recall;
    expect(
      recall,
      `Overall recall ${(recall * 100).toFixed(0)}% is below threshold ${(RECALL_THRESHOLD * 100).toFixed(0)}%`
    ).toBeGreaterThanOrEqual(RECALL_THRESHOLD);
  });

  it("no category regressed more than 10pp vs baseline", async () => {
    const [report, baseline] = await Promise.all([loadNewestReport(), loadBaseline()]);
    if (!report) return;
    if (!baseline) {
      console.warn("No baseline.json — skipping regression check. Copy a report to evals/results/baseline.json.");
      return;
    }

    const regressions: string[] = [];
    for (const [cat, score] of Object.entries(report.scores.byCategory)) {
      const baseScore = baseline.scores.byCategory[cat];
      if (!baseScore) continue;
      const delta = score.recall - baseScore.recall;
      if (delta < -MAX_REGRESSION) {
        regressions.push(`${cat}: ${(baseScore.recall * 100).toFixed(0)}% → ${(score.recall * 100).toFixed(0)}% (Δ ${(delta * 100).toFixed(0)}pp)`);
      }
    }

    expect(
      regressions,
      `Category recall regressions > ${MAX_REGRESSION * 100}pp:\n${regressions.join("\n")}`
    ).toHaveLength(0);
  });
});
