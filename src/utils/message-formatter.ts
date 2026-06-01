import type { WorkflowParams } from "../tools/extract-workflow-params.js";

export function formatConfirmationMessage(
  params: WorkflowParams,
  confidence: number,
  timeoutMs: number
): string {
  return [
    `Workflow detection confidence: ${(confidence * 100).toFixed(0)}%`,
    "",
    `Goal: ${params.goal}`,
    `Template: ${params.template}`,
    `Tasks: ${params.taskCount}`,
    params.perspective ? `Perspective: ${params.perspective}` : undefined,
    params.contextInferred ? "Goal inferred from workspace context." : undefined,
    "",
    "Options:",
    "A) Run workflow",
    "B) Answer directly",
    "C) Show more details",
    `Auto-select: A in ${Math.floor(timeoutMs / 1000)}s`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatWorkflowStart(params: WorkflowParams): string {
  return [
    "Launching workflow...",
    `Goal: ${params.goal}`,
    `Template: ${params.template}`,
    `Tasks: ${params.taskCount}`,
    params.perspective ? `Perspective: ${params.perspective}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}
