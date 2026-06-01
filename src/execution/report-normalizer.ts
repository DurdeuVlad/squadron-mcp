import type { NormalizedExecutorReport } from "./types.js";

interface ParsedPayload {
  summary?: unknown;
  outputs?: unknown;
  issues?: unknown;
  recommendations?: unknown;
  metrics?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function extractFencedJson(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/iu);
  return fenced?.[1]?.trim() ?? null;
}

function extractEmbeddedJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function parsePayload(text: string): { payload?: ParsedPayload; parser: NormalizedExecutorReport["parser"] } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { parser: "plain-text" };
  }

  try {
    return { payload: JSON.parse(trimmed) as ParsedPayload, parser: "json" };
  } catch {
    // ignore
  }

  const fenced = extractFencedJson(trimmed);
  if (fenced) {
    try {
      return { payload: JSON.parse(fenced) as ParsedPayload, parser: "fenced-json" };
    } catch {
      // ignore
    }
  }

  const embedded = extractEmbeddedJson(trimmed);
  if (embedded) {
    try {
      return { payload: JSON.parse(embedded) as ParsedPayload, parser: "embedded-json" };
    } catch {
      // ignore
    }
  }

  return { parser: "plain-text" };
}

export function normalizeExecutorReport(
  stdout: string,
  stderr: string,
  fallbackSummary: string
): NormalizedExecutorReport {
  const { payload, parser } = parsePayload(stdout);
  if (!payload) {
    const summary = stdout.trim() || stderr.trim() || fallbackSummary;
    return {
      summary: summary.slice(0, 2_000),
      outputs: [],
      issues: [],
      recommendations: [],
      metrics: {},
      rawOutput: stdout,
      parser,
    };
  }

  const metrics = typeof payload.metrics === "object" && payload.metrics !== null
    ? (payload.metrics as Record<string, unknown>)
    : {};

  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim().length > 0
        ? payload.summary
        : fallbackSummary,
    outputs: asStringArray(payload.outputs),
    issues: asStringArray(payload.issues),
    recommendations: asStringArray(payload.recommendations),
    metrics: {
      tokenUsage: asOptionalNumber(metrics.tokenUsage),
      tokensUsed: asOptionalNumber(metrics.tokensUsed),
      durationSeconds: asOptionalNumber(metrics.durationSeconds),
      testsPassed: asOptionalNumber(metrics.testsPassed),
      testsTotal: asOptionalNumber(metrics.testsTotal),
      buildSuccess: asOptionalBoolean(metrics.buildSuccess),
    },
    rawOutput: stdout,
    parser,
  };
}
