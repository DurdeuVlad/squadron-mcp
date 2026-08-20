import type { NormalizedExecutorReport } from "./types.js";

interface ParsedPayload {
  summary?: unknown;
  outputs?: unknown;
  issues?: unknown;
  recommendations?: unknown;
  metrics?: unknown;
}

// Shape of `claude --output-format json`'s own wrapper: the real answer is
// nested inside `.result` (itself possibly fenced/embedded JSON), not at the
// top level. Detected structurally (has `result: string` plus at least one of
// the CLI's own metadata fields) rather than by agent name, since other CLIs
// may adopt the same shape.
export interface CliEnvelope {
  result: string;
  usage?: Record<string, unknown>;
  total_cost_usd?: number;
}

function isCliEnvelope(value: unknown): value is CliEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.result !== "string") {
    return false;
  }
  return (typeof obj.usage === "object" && obj.usage !== null) || typeof obj.total_cost_usd === "number";
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

/**
 * Real, CLI-measured token usage from a detected envelope (input + output +
 * cache tokens - cache reads are still real billed cost even though they
 * aren't "generation"). Used only as a fallback when the delegate's own
 * self-reported metrics are absent or exactly zero - a delegate that did no
 * "implementation work" by its own accounting still spent real tokens
 * bootstrapping the subprocess call, and that's what cost tracking should
 * reflect.
 */
function envelopeTokenFallback(envelope: CliEnvelope): number | undefined {
  const usage = envelope.usage;
  if (!usage) {
    return undefined;
  }
  const fields = ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"];
  let total = 0;
  let sawAny = false;
  for (const field of fields) {
    const value = usage[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      sawAny = true;
    }
  }
  return sawAny ? total : undefined;
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

/** json -> fenced-json -> embedded-json -> plain-text, without envelope awareness. */
function parseInner(text: string): { payload?: ParsedPayload; parser: NormalizedExecutorReport["parser"] } {
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

interface ParseResult {
  payload?: ParsedPayload;
  parser: NormalizedExecutorReport["parser"];
  /** Text to fall back to as the summary when no payload parses - the raw
   * stdout normally, but the unwrapped `.result` text when a CLI envelope
   * was detected, so a plain-text answer inside `.result` doesn't get buried
   * under the envelope's own JSON metadata. */
  fallbackText: string;
  /** Present only when stdout was a known CLI wrapper (e.g. claude
   * --output-format json) - carries usage/cost metadata for token tracking. */
  envelope?: CliEnvelope;
}

function parsePayload(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { parser: "plain-text", fallbackText: text };
  }

  let rootParsed: unknown;
  try {
    rootParsed = JSON.parse(trimmed);
  } catch {
    rootParsed = undefined;
  }

  if (rootParsed !== undefined) {
    if (isCliEnvelope(rootParsed)) {
      // Don't treat the envelope itself as the report - the real payload is
      // nested inside .result. Re-run the same fallback chain against it.
      const inner = parseInner(rootParsed.result);
      return { ...inner, fallbackText: rootParsed.result, envelope: rootParsed };
    }
    return { payload: rootParsed as ParsedPayload, parser: "json", fallbackText: text };
  }

  const fenced = extractFencedJson(trimmed);
  if (fenced) {
    try {
      return { payload: JSON.parse(fenced) as ParsedPayload, parser: "fenced-json", fallbackText: text };
    } catch {
      // ignore
    }
  }

  const embedded = extractEmbeddedJson(trimmed);
  if (embedded) {
    try {
      return { payload: JSON.parse(embedded) as ParsedPayload, parser: "embedded-json", fallbackText: text };
    } catch {
      // ignore
    }
  }

  return { parser: "plain-text", fallbackText: text };
}

export function normalizeExecutorReport(
  stdout: string,
  stderr: string,
  fallbackSummary: string
): NormalizedExecutorReport {
  const { payload, parser, fallbackText, envelope } = parsePayload(stdout);
  const envelopeFallback = envelope ? envelopeTokenFallback(envelope) : undefined;

  if (!payload) {
    const summary = fallbackText.trim() || stderr.trim() || fallbackSummary;
    return {
      summary: summary.slice(0, 2_000),
      outputs: [],
      issues: [],
      recommendations: [],
      metrics: envelopeFallback !== undefined ? { tokenUsage: envelopeFallback } : {},
      rawOutput: stdout,
      parser,
    };
  }

  const metrics = typeof payload.metrics === "object" && payload.metrics !== null
    ? (payload.metrics as Record<string, unknown>)
    : {};

  const selfReportedTokens = asOptionalNumber(metrics.tokenUsage) || asOptionalNumber(metrics.tokensUsed);
  // A delegate that self-reports 0 (or omits the field) still spent real
  // tokens bootstrapping the subprocess call - fall back to the CLI's own
  // measured usage rather than tracking zero cost for a real call.
  const tokenUsage = selfReportedTokens ? selfReportedTokens : envelopeFallback;

  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim().length > 0
        ? payload.summary
        : fallbackSummary,
    outputs: asStringArray(payload.outputs),
    issues: asStringArray(payload.issues),
    recommendations: asStringArray(payload.recommendations),
    metrics: {
      tokenUsage,
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
