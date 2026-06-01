import { z } from "zod";

import type { IntentClassification } from "./classify-intent.js";
import type { ToolDefinition } from "./types.js";

const extractWorkflowParamsSchema = z.object({
  userMessage: z.string().min(1, "userMessage is required"),
  classification: z
    .object({
      suggestedTemplate: z.string().optional(),
    })
    .partial()
    .optional(),
});

export type ExtractWorkflowParamsInput = z.infer<typeof extractWorkflowParamsSchema>;

export interface WorkflowParams {
  goal: string;
  perspective?: string;
  taskCount: number;
  isAudit: boolean;
  template: string;
  confidence: number;
  contextInferred?: boolean;
}

function extractTaskCount(message: string): number | undefined {
  const match = message.match(/(\d+)\s*[- ]?tasks?/i);
  if (!match) {
    return undefined;
  }

  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.min(value, 50);
}

function extractPerspective(message: string): string | undefined {
  const direct = message.match(/from\s+([a-z0-9 -]+?)\s+perspective/i);
  if (direct?.[1]) {
    return direct[1].trim().toLowerCase();
  }

  const prefixed = message.match(/([a-z0-9-]+)\s+audit/i);
  if (prefixed?.[1]) {
    return prefixed[1].trim().toLowerCase();
  }

  return undefined;
}

function cleanGoal(message: string): string {
  return message
    .replace(/^(please|can you|could you|i want to|i need to)\s+/i, "")
    .replace(/\s+from\s+[a-z0-9 -]+?\s+perspective/gi, "")
    .replace(/\s+with\s+\d+\s*[- ]?tasks?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function determineTemplate(
  isAudit: boolean,
  classification?: Pick<IntentClassification, "suggestedTemplate">
): string {
  if (isAudit) {
    return "audit-workflow";
  }

  return classification?.suggestedTemplate ?? "user-standard-workflow";
}

function computeConfidence(goal: string, message: string): number {
  let confidence = 0.55;
  const words = goal.split(/\s+/).filter(Boolean).length;
  if (words >= 3) {
    confidence += 0.2;
  }
  if (/(implement|build|create|audit|analy[sz]e|refactor|optimize|fix)/i.test(goal)) {
    confidence += 0.2;
  }
  if (message.length <= 12) {
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

export function extractWorkflowParams(input: ExtractWorkflowParamsInput): WorkflowParams {
  const message = input.userMessage.trim();
  const goal = cleanGoal(message);
  const perspective = extractPerspective(message);
  const taskCount = extractTaskCount(message) ?? 6;
  const isAudit = /audit|analy[sz]e|review/i.test(message);
  const template = determineTemplate(isAudit, input.classification);
  const confidence = computeConfidence(goal, message);

  return {
    goal,
    perspective,
    taskCount,
    isAudit,
    template,
    confidence,
  };
}

export const extractWorkflowParamsTool: ToolDefinition<ExtractWorkflowParamsInput, WorkflowParams> = {
  name: "extract_workflow_params",
  description: "Extract structured workflow parameters from a natural language request.",
  inputSchema: {
    type: "object",
    properties: {
      userMessage: { type: "string" },
      classification: {
        type: "object",
        properties: {
          suggestedTemplate: { type: "string" },
        },
      },
    },
    required: ["userMessage"],
  },
  schema: extractWorkflowParamsSchema,
  handler: (input: ExtractWorkflowParamsInput): WorkflowParams => extractWorkflowParams(input),
};
