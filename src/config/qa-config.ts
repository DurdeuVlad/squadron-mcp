import type { AgentType } from "./agent-config.js";

export type QAAgentSelection = "auto" | AgentType;

export interface QAConfig {
  enabled: boolean;
  haltOnCritical: boolean;
  selfReview: boolean;
  automatedChecks: boolean;
  minQualityScore: number;
  agentSelection: QAAgentSelection;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() !== "false";
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = value !== undefined ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readAgentSelection(value: string | undefined): QAAgentSelection {
  if (value === "claude" || value === "gemini" || value === "codex") {
    return value;
  }
  return "auto";
}

export function getQAConfig(): QAConfig {
  return {
    enabled: readBoolean(process.env.QA_ENABLED, readBoolean(process.env.AUTO_QA, true)),
    haltOnCritical: readBoolean(process.env.QA_HALT_ON_CRITICAL, true),
    selfReview: readBoolean(process.env.QA_SELF_REVIEW, true),
    automatedChecks: readBoolean(process.env.QA_AUTOMATED_CHECKS, true),
    minQualityScore: clamp(Math.round(readNumber(process.env.QA_MIN_QUALITY_SCORE, 7)), 1, 10),
    agentSelection: readAgentSelection(process.env.QA_AGENT_SELECTION),
  };
}
