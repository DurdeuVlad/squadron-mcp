import { z } from "zod";

import {
  CLASSIFICATION_RULES as classificationRules,
  type ClassificationRule,
} from "../config/classification-rules.js";
import type { ToolDefinition } from "./types.js";

const classifyIntentSchema = z.object({
  userMessage: z.string().min(1, "userMessage is required"),
  context: z
    .object({
      currentFile: z.string().optional(),
      currentFolder: z.string().optional(),
    })
    .optional(),
});

export type ClassifyIntentInput = z.infer<typeof classifyIntentSchema>;

export type IntentType = "simple-question" | "complex-task" | "workflow-candidate";
export type IntentAction = "answer-directly" | "use-mcp-tool" | "trigger-workflow";

export interface IntentClassification {
  type: IntentType;
  confidence: number;
  recommendedAction: IntentAction;
  suggestedTemplate?: string;
  detectedGoal?: string;
  reasoning: string;
  scores: {
    workflow: number;
    simpleQuestion: number;
    complexTask: number;
  };
}

function computePatternScore(message: string, patterns: ClassificationRule[]): number {
  let score = 0;
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, "i");
    if (regex.test(message)) {
      score = Math.max(score, pattern.weight);
    }
  }
  return score;
}

function computeComplexityScore(message: string): number {
  const tokenCount = message.trim().split(/\s+/).filter(Boolean).length;
  const capped = Math.min(tokenCount, 24) / 24;
  return Math.max(0, Math.min(1, capped));
}

function detectGoal(message: string): string | undefined {
  const normalized = message
    .replace(/^(please|can you|could you|i want to|i need to)\s+/i, "")
    .trim();
  return normalized.length > 4 ? normalized : undefined;
}

function detectTemplate(message: string, patterns: ClassificationRule[]): string | undefined {
  for (const pattern of patterns) {
    if (pattern.suggestedTemplate && new RegExp(pattern.regex, "i").test(message)) {
      return pattern.suggestedTemplate;
    }
  }

  return undefined;
}

export function classifyIntent(input: ClassifyIntentInput): IntentClassification {
  const message = input.userMessage.trim();
  const lower = message.toLowerCase();

  const workflowPattern = computePatternScore(lower, classificationRules.workflowTriggers.patterns);
  const questionPattern = computePatternScore(lower, classificationRules.simpleQuestions.patterns);
  const taskPattern = computePatternScore(lower, classificationRules.complexTasks.patterns);
  const imperativeWorkflowVerb = /^(implement|build|create|add|fix|optimize|refactor)\b/i.test(
    message
  )
    ? 0.08
    : 0;

  const complexity = computeComplexityScore(lower);
  const workflowScore =
    workflowPattern * 0.6 + complexity * 0.2 + (1 - questionPattern) * 0.2 + imperativeWorkflowVerb;
  const questionScore = questionPattern * 0.6 + (1 - complexity) * 0.2 + (1 - workflowPattern) * 0.2;
  const taskScore = taskPattern * 0.6 + complexity * 0.2 + (1 - questionPattern) * 0.2;

  const scores = {
    workflow: Number(workflowScore.toFixed(4)),
    simpleQuestion: Number(questionScore.toFixed(4)),
    complexTask: Number(taskScore.toFixed(4)),
  };

  const ranked = [
    { type: "workflow-candidate" as const, score: scores.workflow },
    { type: "simple-question" as const, score: scores.simpleQuestion },
    { type: "complex-task" as const, score: scores.complexTask },
  ].sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const confidence = Math.max(0, Math.min(1, winner.score));

  const recommendedAction: Record<IntentType, IntentAction> = {
    "workflow-candidate": "trigger-workflow",
    "simple-question": "answer-directly",
    "complex-task": "use-mcp-tool",
  };

  return {
    type: winner.type,
    confidence,
    recommendedAction: recommendedAction[winner.type],
    suggestedTemplate:
      winner.type === "workflow-candidate"
        ? detectTemplate(lower, classificationRules.workflowTriggers.patterns)
        : undefined,
    detectedGoal: detectGoal(message),
    reasoning:
      `Intent=${winner.type} (${(confidence * 100).toFixed(0)}%). ` +
      `Scores workflow=${scores.workflow.toFixed(2)}, question=${scores.simpleQuestion.toFixed(2)}, task=${scores.complexTask.toFixed(2)}.`,
    scores,
  };
}

export const classifyIntentTool: ToolDefinition<ClassifyIntentInput, IntentClassification> = {
  name: "classify_intent",
  description: "Classify user intent to determine whether auto-orchestration should run.",
  inputSchema: {
    type: "object",
    properties: {
      userMessage: {
        type: "string",
        description: "Natural language user request.",
      },
      context: {
        type: "object",
        properties: {
          currentFile: { type: "string" },
          currentFolder: { type: "string" },
        },
      },
    },
    required: ["userMessage"],
  },
  schema: classifyIntentSchema,
  handler: (input: ClassifyIntentInput): IntentClassification => classifyIntent(input),
};
