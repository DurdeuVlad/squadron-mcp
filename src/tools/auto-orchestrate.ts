import { z } from "zod";

import { getAutoTriggerConfig } from "../config/auto-trigger-config.js";
import { formatConfirmationMessage, formatWorkflowStart } from "../utils/message-formatter.js";
import { classifyIntent, type IntentClassification } from "./classify-intent.js";
import {
  applyContextToClassification,
  applyContextToParams,
  detectContext,
  type WorkspaceContext,
} from "./detect-context.js";
import { extractWorkflowParams, type WorkflowParams } from "./extract-workflow-params.js";
import { executeWorkflowTool, type WorkflowState } from "./execute-workflow.js";
import { ProgressReporter, type ProgressUpdate } from "./progress-reporter.js";
import type { ToolDefinition } from "./types.js";

const autoOrchestrateSchema = z.object({
  userMessage: z.string().min(1, "userMessage is required"),
  context: z
    .object({
      currentFile: z.string().optional(),
      currentFolder: z.string().optional(),
    })
    .optional(),
});

export type AutoOrchestrateInput = z.infer<typeof autoOrchestrateSchema>;

export type AutoDecision =
  | "trigger-workflow"
  | "ask-confirmation"
  | "answer-directly"
  | "use-mcp-tool";

export interface AutoOrchestrateResult {
  decision: AutoDecision;
  confidence: number;
  classification: IntentClassification;
  context: WorkspaceContext;
  workflowParams?: WorkflowParams;
  confirmationMessage?: string;
  workflowResult?: WorkflowState;
  progressUpdates?: ProgressUpdate[];
  progressSummary?: string;
  reasoning: string;
}

function resolveNonWorkflowDecision(classification: IntentClassification): AutoDecision {
  if (classification.recommendedAction === "use-mcp-tool") {
    return "use-mcp-tool";
  }
  return "answer-directly";
}

function decideWorkflowAction(
  confidence: number,
  askFirst: boolean,
  minConfidence: number,
  yoloConfidence: number
): AutoDecision {
  if (confidence >= yoloConfidence) {
    return "trigger-workflow";
  }

  if (confidence >= minConfidence) {
    return askFirst ? "ask-confirmation" : "trigger-workflow";
  }

  return "answer-directly";
}

function combinedConfidence(intentConfidence: number, extractionConfidence: number): number {
  return Math.max(0, Math.min(1, (intentConfidence + extractionConfidence) / 2));
}

export function createAutoOrchestrateTool(): ToolDefinition<AutoOrchestrateInput, AutoOrchestrateResult> {
  return {
    name: "auto_orchestrate",
    description:
      "Classify intent, extract workflow parameters, and intelligently decide whether to run a workflow.",
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
    schema: autoOrchestrateSchema,
    handler: async (input: AutoOrchestrateInput): Promise<AutoOrchestrateResult> => {
      const config = getAutoTriggerConfig();
      const context = config.contextDetectionEnabled
        ? detectContext(input.context ?? {})
        : detectContext({});

      let classification = classifyIntent(input);
      classification = applyContextToClassification(classification, context);

      if (!config.enabled || classification.type !== "workflow-candidate") {
        const decision = resolveNonWorkflowDecision(classification);
        return {
          decision,
          confidence: classification.confidence,
          classification,
          context,
          reasoning: `Auto-trigger ${
            config.enabled ? "enabled" : "disabled"
          }. Classified as ${classification.type}.`,
        };
      }

      let workflowParams = extractWorkflowParams({
        userMessage: input.userMessage,
        classification,
      });
      workflowParams = applyContextToParams(workflowParams, context);

      const confidence = combinedConfidence(classification.confidence, workflowParams.confidence);
      const decision = decideWorkflowAction(
        confidence,
        config.askFirst,
        config.minConfidence,
        config.yoloConfidence
      );

      if (decision === "ask-confirmation") {
        return {
          decision,
          confidence,
          classification,
          workflowParams,
          context,
          confirmationMessage: formatConfirmationMessage(
            workflowParams,
            confidence,
            config.confirmationTimeout
          ),
          reasoning: "Medium confidence workflow candidate; confirmation required.",
        };
      }

      if (decision !== "trigger-workflow") {
        return {
          decision,
          confidence,
          classification,
          workflowParams,
          context,
          reasoning: "Confidence below workflow threshold; returning direct-answer path.",
        };
      }

      const reporter = new ProgressReporter(3);
      reporter.report(1, "Classified intent", "completed");
      reporter.report(2, "Extracted workflow parameters", "completed");
      reporter.report(3, "Executing workflow", "in-progress");
      const workflowResult = await executeWorkflowTool({
        goal: workflowParams.goal,
        perspective: workflowParams.perspective,
        taskCount: workflowParams.taskCount,
        yoloMode: confidence >= config.yoloConfidence,
      });
      reporter.report(3, "Workflow execution finished", workflowResult.status === "completed" ? "completed" : "failed");

      return {
        decision,
        confidence,
        classification,
        workflowParams,
        context,
        workflowResult,
        progressUpdates: reporter.getUpdates(),
        progressSummary: `${formatWorkflowStart(workflowParams)}\n\n${reporter.summary()}`,
        reasoning: "High confidence workflow candidate; workflow triggered automatically.",
      };
    },
  };
}
