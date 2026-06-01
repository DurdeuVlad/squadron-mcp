import { QA_PERSPECTIVES, type PerspectiveOverlay } from "../config/qa-perspectives.js";
import { detectQAContext, type DetectQAContextInput, type QAContext } from "./detect-qa-context.js";

export type QASeverity = "low" | "medium" | "high" | "critical";

export interface QAPromptInjection {
  context: QAContext;
  prompts: string[];
  automatedChecks: string[];
  fullPrompt: string;
  severity: QASeverity;
}

const CATEGORY_SEVERITY: Record<QAContext["category"], QASeverity> = {
  code: "high",
  documentation: "medium",
  configuration: "high",
  tests: "medium",
  database: "high",
  other: "low",
};

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function resolveOverlay(perspective?: string): PerspectiveOverlay | undefined {
  if (!perspective) {
    return undefined;
  }
  return QA_PERSPECTIVES[perspective.toLowerCase()];
}

function resolveSeverity(context: QAContext, overlay?: PerspectiveOverlay): QASeverity {
  if (overlay) {
    return overlay.severity;
  }
  return CATEGORY_SEVERITY[context.category];
}

function buildPrompt(context: QAContext, prompts: string[], severity: QASeverity): string {
  const lines = [
    "# Quality Assurance Checklist",
    `Category: ${context.category}${context.subCategory ? `/${context.subCategory}` : ""}`,
    `Severity: ${severity}`,
    "",
    "Review criteria:",
    ...prompts.map((prompt, index) => `${index + 1}. ${prompt}`),
  ];

  if (context.automatedChecks.length > 0) {
    lines.push("", "Suggested automated checks:");
    lines.push(...context.automatedChecks.map((command) => `- ${command}`));
  }

  return lines.join("\n");
}

export function injectQAPrompts(input: DetectQAContextInput): QAPromptInjection {
  const context = detectQAContext(input);
  const overlay = resolveOverlay(context.perspective);
  const prompts = dedupe([...context.selectedPrompts, ...context.additionalPrompts]);
  const severity = resolveSeverity(context, overlay);

  return {
    context,
    prompts,
    automatedChecks: context.automatedChecks,
    fullPrompt: buildPrompt(context, prompts, severity),
    severity,
  };
}
