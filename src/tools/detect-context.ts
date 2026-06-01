import { z } from "zod";

import { CONTEXT_RULES as contextRules } from "../config/context-rules.js";
import type { ToolDefinition } from "./types.js";

const detectContextSchema = z.object({
  currentFile: z.string().optional(),
  currentFolder: z.string().optional(),
});

export type DetectContextInput = z.infer<typeof detectContextSchema>;

export interface WorkspaceContext {
  currentFile?: string;
  currentFolder?: string;
  inSprintFolder: boolean;
  sprintNumber?: number;
  sprintGoal?: string;
  inTestFolder: boolean;
  inDocsFolder: boolean;
  suggestedTemplate?: string;
  suggestedGoal?: string;
  confidenceBoost: number;
}

function normalizePath(value?: string): string {
  return (value ?? "").replace(/\\/g, "/").toLowerCase();
}

function detectSprintContext(pathValue: string): Pick<WorkspaceContext, "inSprintFolder" | "sprintNumber" | "sprintGoal"> {
  const match = pathValue.match(/sprints\/sprint-(\d+)-?([^/]*)/i);
  if (!match) {
    return { inSprintFolder: false };
  }

  const sprintGoal = match[2] ? match[2].replace(/-/g, " ").trim() : "unknown goal";
  return {
    inSprintFolder: true,
    sprintNumber: Number.parseInt(match[1], 10),
    sprintGoal,
  };
}

function detectTemplateFromFile(currentFile?: string): string | undefined {
  const file = normalizePath(currentFile);
  if (!file) {
    return undefined;
  }

  const patterns = contextRules.filePatterns as Record<string, string>;
  for (const [key, template] of Object.entries(patterns)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith(".")) {
      if (file.endsWith(lowerKey)) {
        return template;
      }
      continue;
    }

    if (file.includes(lowerKey.toLowerCase())) {
      return template;
    }
  }

  return undefined;
}

export function detectContext(input: DetectContextInput): WorkspaceContext {
  const currentFolder = normalizePath(input.currentFolder);
  const sprintContext = detectSprintContext(currentFolder);
  const inTestFolder = currentFolder.includes("/tests") || currentFolder.includes("/test");
  const inDocsFolder = currentFolder.includes("/docs") || currentFolder.endsWith("/docs");

  let confidenceBoost = 0;
  let suggestedTemplate: string | undefined;

  if (sprintContext.inSprintFolder) {
    confidenceBoost += contextRules.folderPatterns["sprints/"].confidenceBoost;
    suggestedTemplate = contextRules.folderPatterns["sprints/"].suggestedTemplate;
  } else if (inTestFolder) {
    confidenceBoost += contextRules.folderPatterns["tests/"].confidenceBoost;
    suggestedTemplate = contextRules.folderPatterns["tests/"].suggestedTemplate;
  } else if (inDocsFolder) {
    confidenceBoost += contextRules.folderPatterns["docs/"].confidenceBoost;
    suggestedTemplate = contextRules.folderPatterns["docs/"].suggestedTemplate;
  } else if (currentFolder.includes("/src")) {
    confidenceBoost += contextRules.folderPatterns["src/"].confidenceBoost;
    suggestedTemplate = contextRules.folderPatterns["src/"].suggestedTemplate;
  }

  suggestedTemplate = detectTemplateFromFile(input.currentFile) ?? suggestedTemplate;

  return {
    currentFile: input.currentFile,
    currentFolder: input.currentFolder,
    ...sprintContext,
    inTestFolder,
    inDocsFolder,
    suggestedTemplate,
    suggestedGoal:
      sprintContext.inSprintFolder && sprintContext.sprintNumber
        ? `continue sprint ${String(sprintContext.sprintNumber).padStart(3, "0")} - ${sprintContext.sprintGoal}`
        : undefined,
    confidenceBoost: Math.max(-0.2, Math.min(0.2, confidenceBoost)),
  };
}

export function applyContextToClassification<T extends { confidence: number; suggestedTemplate?: string }>(
  classification: T,
  context: WorkspaceContext
): T {
  return {
    ...classification,
    confidence: Math.max(0, Math.min(1, classification.confidence + context.confidenceBoost)),
    suggestedTemplate: context.suggestedTemplate ?? classification.suggestedTemplate,
  };
}

export function applyContextToParams<
  T extends { goal: string; confidence: number; template?: string; contextInferred?: boolean }
>(params: T, context: WorkspaceContext): T {
  if (context.suggestedGoal && params.goal.trim().split(/\s+/).length <= 2) {
    return {
      ...params,
      goal: context.suggestedGoal,
      confidence: Math.max(params.confidence, 0.85),
      template: params.template ?? context.suggestedTemplate,
      contextInferred: true,
    };
  }

  if (context.suggestedTemplate && !params.template) {
    return {
      ...params,
      template: context.suggestedTemplate,
    };
  }

  return params;
}

export const detectContextTool: ToolDefinition<DetectContextInput, WorkspaceContext> = {
  name: "detect_context",
  description: "Detect workspace context signals used for auto-orchestration decisions.",
  inputSchema: {
    type: "object",
    properties: {
      currentFile: { type: "string" },
      currentFolder: { type: "string" },
    },
  },
  schema: detectContextSchema,
  handler: (input: DetectContextInput): WorkspaceContext => detectContext(input),
};
