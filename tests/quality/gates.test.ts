import { describe, expect, it } from "vitest";

import { runQualityGates } from "../../src/quality/gates.js";

describe("quality gates", () => {
  it("passes valid report", () => {
    const result = runQualityGates({
      status: "completed",
      issues: [],
      metrics: {
        testsPassed: 10,
        testsTotal: 10,
        buildSuccess: true,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails report with critical issue", () => {
    const result = runQualityGates({
      status: "completed",
      issues: ["CRITICAL: build broke"],
      metrics: {
        testsPassed: 5,
        testsTotal: 5,
        buildSuccess: true,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});
