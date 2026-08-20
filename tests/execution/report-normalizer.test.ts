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

  it("unwraps a claude --output-format json CLI envelope and extracts the nested report", () => {
    const envelope = JSON.stringify({
      is_error: false,
      total_cost_usd: 0.073,
      usage: { input_tokens: 28, output_tokens: 4089 },
      result:
        '```json\n{"summary":"Added the docstring.","outputs":["src/math.ts"],"issues":[],"recommendations":[],"metrics":{"tokensUsed":42}}\n```',
    });

    const normalized = normalizeExecutorReport(envelope, "", "fallback");

    expect(normalized.summary).toBe("Added the docstring.");
    expect(normalized.outputs).toEqual(["src/math.ts"]);
    expect(normalized.metrics.tokensUsed).toBe(42);
    expect(normalized.parser).toBe("fenced-json");
  });

  it("falls back to the envelope's unwrapped .result text when it isn't parseable JSON", () => {
    const envelope = JSON.stringify({
      is_error: false,
      total_cost_usd: 0.01,
      usage: { input_tokens: 5, output_tokens: 3 },
      result: "Just a plain-text answer, no JSON report.",
    });

    const normalized = normalizeExecutorReport(envelope, "", "fallback");

    expect(normalized.parser).toBe("plain-text");
    expect(normalized.summary).toBe("Just a plain-text answer, no JSON report.");
  });

  it("does not treat an object with a bare 'result' field (no usage/cost metadata) as a CLI envelope", () => {
    // Guards against false-positive envelope detection on an app-level report
    // that happens to use "result" as a field name for something else.
    const normalized = normalizeExecutorReport(
      JSON.stringify({ summary: "done", result: "unrelated", outputs: [], issues: [], recommendations: [], metrics: {} }),
      "",
      "fallback"
    );

    expect(normalized.parser).toBe("json");
    expect(normalized.summary).toBe("done");
  });
});
