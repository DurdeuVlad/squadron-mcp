import { describe, expect, it } from "vitest";

import { normalizeExecutorReport } from "../../src/execution/report-normalizer.js";

describe("report-normalizer", () => {
  it("parses direct JSON payload", () => {
    const normalized = normalizeExecutorReport(
      JSON.stringify({
        summary: "done",
        outputs: ["a.ts"],
        issues: [],
        recommendations: ["ship it"],
        metrics: { tokensUsed: 10, buildSuccess: true },
      }),
      "",
      "fallback"
    );

    expect(normalized.parser).toBe("json");
    expect(normalized.summary).toBe("done");
    expect(normalized.metrics.tokensUsed).toBe(10);
    expect(normalized.outputs).toEqual(["a.ts"]);
  });

  it("parses fenced json payload", () => {
    const normalized = normalizeExecutorReport(
      "```json\n{\"summary\":\"fenced\",\"outputs\":[\"x\"],\"issues\":[],\"recommendations\":[],\"metrics\":{}}\n```",
      "",
      "fallback"
    );

    expect(normalized.parser).toBe("fenced-json");
    expect(normalized.summary).toBe("fenced");
  });

  it("falls back to plain text summary", () => {
    const normalized = normalizeExecutorReport("plain output", "err", "fallback");

    expect(normalized.parser).toBe("plain-text");
    expect(normalized.summary).toBe("plain output");
    expect(normalized.outputs).toEqual([]);
  });
});
