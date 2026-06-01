import { afterEach, describe, expect, it } from "vitest";

import { executeWorkflowTool } from "../../src/tools/execute-workflow.js";

const ENV_KEYS = [
  "QA_ENABLED",
  "QA_HALT_ON_CRITICAL",
  "QA_SELF_REVIEW",
  "QA_AUTOMATED_CHECKS",
  "QA_MIN_QUALITY_SCORE",
  "QA_AGENT_SELECTION",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("QA workflow integration", () => {
  it("runs QA checks for each workflow stage", async () => {
    process.env.QA_ENABLED = "true";
    process.env.QA_HALT_ON_CRITICAL = "true";
    process.env.QA_MIN_QUALITY_SCORE = "6";

    const result = await executeWorkflowTool({
      goal: "Implement workflow executor",
      perspective: "maintainability",
      taskCount: 3,
    });

    expect(result.status).toBe("completed");
    expect(result.qaResults.length).toBe(5);
    expect(result.qaReport).toContain("Quality Assurance Report");
    expect(result.qualityMetrics?.totalChecks).toBe(5);
  });

  it("records QA failures without halting on non-critical severity", async () => {
    process.env.QA_ENABLED = "true";
    process.env.QA_HALT_ON_CRITICAL = "true";
    process.env.QA_MIN_QUALITY_SCORE = "7";
    process.env.QA_AUTOMATED_CHECKS = "true";

    const result = await executeWorkflowTool({
      goal: "Validate JSON config",
      filePath: "config/tooling.json",
      fileContent: "{invalid}",
    });

    expect(result.status).toBe("completed");
    expect(result.qaResults.some((qa) => !qa.passed)).toBe(true);
  });

  it("halts workflow on critical QA failure when configured", async () => {
    process.env.QA_ENABLED = "true";
    process.env.QA_HALT_ON_CRITICAL = "true";
    process.env.QA_MIN_QUALITY_SCORE = "10";
    process.env.QA_SELF_REVIEW = "true";

    const result = await executeWorkflowTool({
      goal: "T",
      perspective: "security",
      taskCount: 1,
    });

    expect(result.status).toBe("failed");
    expect(result.errors.some((error) => error.includes("Critical QA check failed"))).toBe(true);
  });
});
