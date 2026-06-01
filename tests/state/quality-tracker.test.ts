import { describe, expect, it } from "vitest";

import { QualityTracker } from "../../src/state/quality-tracker.js";

describe("QualityTracker", () => {
  it("records and aggregates workflow QA metrics", () => {
    const tracker = new QualityTracker();

    tracker.recordQAResult(
      {
        stage: "planning",
        context: {
          category: "code",
          fileExtension: ".ts",
          filePath: "src/index.ts",
          selectedPrompts: [],
          automatedChecks: [],
          additionalPrompts: [],
        },
        severity: "high",
        passed: true,
        qualityScore: 8,
        issues: [],
      },
      "gemini",
      "wf-1"
    );

    tracker.recordQAResult(
      {
        stage: "review",
        context: {
          category: "documentation",
          fileExtension: ".md",
          filePath: "README.md",
          selectedPrompts: [],
          automatedChecks: [],
          additionalPrompts: [],
        },
        severity: "critical",
        passed: false,
        qualityScore: 5,
        issues: ["Missing security disclaimer"],
      },
      "claude",
      "wf-1"
    );

    const metrics = tracker.getWorkflowMetrics("wf-1");
    expect(metrics).toBeDefined();
    expect(metrics?.totalChecks).toBe(2);
    expect(metrics?.passedChecks).toBe(1);
    expect(metrics?.failedChecks).toBe(1);
    expect(metrics?.criticalFailures).toBe(1);
    expect(metrics?.byAgent.claude.checks).toBe(1);
    expect(metrics?.byCategory.documentation.checks).toBe(1);
  });

  it("generates trend report", () => {
    const tracker = new QualityTracker();
    const empty = tracker.generateTrendReport();
    expect(empty).toContain("no workflow metrics");
  });
});
