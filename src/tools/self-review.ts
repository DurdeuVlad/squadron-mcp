import type { AgentType } from "../config/agent-config.js";

export interface SelfReviewResult {
  qualityScore: number;
  issues: string[];
  mitigations: string[];
  confidence: number;
  recommendations: string[];
}

export interface SelfReviewInput {
  taskType: string;
  output: unknown;
  qaPrompts: string[];
  agent: AgentType;
  initialIssues?: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stringifyOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function confidenceFromScore(score: number): number {
  if (score >= 9) return 0.9;
  if (score >= 7) return 0.75;
  if (score >= 5) return 0.6;
  return 0.45;
}

export function buildSelfReviewPrompt(input: SelfReviewInput): string {
  const serializedOutput = stringifyOutput(input.output);
  const criteria = input.qaPrompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n");
  return [
    "# Self-Review Task",
    "",
    `Task type: ${input.taskType}`,
    `Agent: ${input.agent}`,
    "",
    "Output:",
    "```json",
    serializedOutput,
    "```",
    "",
    "Quality criteria:",
    criteria || "1. Verify correctness, clarity, and maintainability.",
  ].join("\n");
}

export function parseSelfReviewResponse(response: string): SelfReviewResult {
  const scoreMatch = response.match(/quality score:\s*(\d+)/i);
  const qualityScore = clamp(scoreMatch ? Number.parseInt(scoreMatch[1] ?? "7", 10) : 7, 1, 10);

  const extractBullets = (section: string): string[] => {
    const pattern = new RegExp(`${section}:([\\s\\S]*?)(?=\\n\\w+\\s*:\\s|$)`, "i");
    const match = response.match(pattern);
    if (!match || !match[1]) return [];
    return match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, ""));
  };

  const confidenceMatch = response.match(/confidence:\s*(low|medium|high|0\.\d+|1(?:\.0+)?)/i);
  let confidence = confidenceFromScore(qualityScore);
  if (confidenceMatch && confidenceMatch[1]) {
    const token = confidenceMatch[1].toLowerCase();
    if (token === "low") confidence = 0.45;
    else if (token === "medium") confidence = 0.7;
    else if (token === "high") confidence = 0.9;
    else confidence = clamp(Number(token), 0, 1);
  }

  return {
    qualityScore,
    issues: extractBullets("issues found"),
    mitigations: extractBullets("mitigations"),
    confidence,
    recommendations: extractBullets("recommendations"),
  };
}

export async function performSelfReview(input: SelfReviewInput): Promise<SelfReviewResult> {
  const outputText = stringifyOutput(input.output);
  const issues = [...(input.initialIssues ?? [])];
  const mitigations: string[] = [];
  const recommendations: string[] = [];

  if (!outputText.trim()) {
    issues.push("Output is empty.");
    mitigations.push("Populate the output with concrete implementation details.");
  }

  if (input.qaPrompts.length > 0 && outputText.length < 120) {
    issues.push("Output appears too brief for requested QA scope.");
    recommendations.push("Expand output with edge cases, validation, and implementation notes.");
  }

  if (/todo|fixme/i.test(outputText)) {
    issues.push("Output contains unresolved TODO/FIXME markers.");
    mitigations.push("Resolve TODO/FIXME items before final handoff.");
  }

  if (/console\.log\(/i.test(outputText)) {
    issues.push("Output contains console.log statements that may be debug leftovers.");
    recommendations.push("Replace ad-hoc logging with structured logging or remove it.");
  }

  const qualityScore = clamp(9 - issues.length, 1, 10);
  const confidence = confidenceFromScore(qualityScore);

  if (issues.length === 0) {
    recommendations.push("No blocking QA concerns detected.");
  }

  return {
    qualityScore,
    issues,
    mitigations,
    confidence,
    recommendations,
  };
}
