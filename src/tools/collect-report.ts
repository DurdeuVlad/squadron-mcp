import { z } from "zod";

import { type StateManager } from "../state/state-manager.js";
import type { TokenStage } from "../state/types.js";
import { TokenTracker } from "../metrics/token-tracker.js";
import { runQualityGates, type QualityGate } from "../quality/gates.js";
import type { ToolDefinition } from "./types.js";

const reportMetricsSchema = z.object({
  tokenUsage: z.number().int().nonnegative().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  testsPassed: z.number().int().nonnegative().optional(),
  testsTotal: z.number().int().nonnegative().optional(),
  buildSuccess: z.boolean().optional(),
});

const collectReportSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
  status: z.enum(["in_progress", "completed", "failed"]).default("completed"),
  summary: z.string().min(1, "summary is required"),
  outputs: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  metrics: reportMetricsSchema.default({}),
  workflowId: z.string().optional(),
  tokenStage: z.enum(["planning", "execution", "validation", "reporting"]).default("reporting"),
});

export type CollectReportInput = z.infer<typeof collectReportSchema>;

export interface CollectedReport {
  reportId: string;
  taskId: string;
  status: "in_progress" | "completed" | "failed";
  summary: string;
  outputs: string[];
  issues: string[];
  recommendations: string[];
  metrics: {
    tokenUsage?: number;
    tokensUsed?: number;
    durationSeconds?: number;
    testsPassed?: number;
    testsTotal?: number;
    buildSuccess?: boolean;
  };
  collectedAt: string;
  nextAction: string;
  taskState: {
    status: "executing" | "completed" | "failed";
    endTime?: string;
  };
  formattedReport: string;
  quality: {
    passed: boolean;
    failures: string[];
  };
}

export interface CollectReportDependencies {
  stateManager: StateManager;
  tokenTracker: TokenTracker;
  qualityGates?: QualityGate[];
}

function nextAction(status: CollectReportInput["status"]): string {
  if (status === "completed") {
    return "Ready for planner review.";
  }

  if (status === "failed") {
    return "Investigate failure and re-delegate task.";
  }

  return "Continue execution and collect updated report.";
}

function toTaskStatus(status: CollectReportInput["status"]): "executing" | "completed" | "failed" {
  if (status === "in_progress") {
    return "executing";
  }

  if (status === "failed") {
    return "failed";
  }

  return "completed";
}

function toReportPayload(input: CollectReportInput): Record<string, unknown> {
  return {
    summary: input.summary,
    outputs: input.outputs,
    issues: input.issues,
    recommendations: input.recommendations,
    metrics: input.metrics,
    collectedAt: new Date().toISOString(),
  };
}

function formatReportForPlanner(input: CollectReportInput, taskName: string): string {
  const statusLabel =
    input.status === "completed" ? "SUCCESS" : input.status === "failed" ? "FAILED" : "IN PROGRESS";
  const outputs = input.outputs.map((output) => `- ${output}`).join("\n");
  const issues = input.issues.map((issue) => `- ${issue}`).join("\n");
  const recommendations = input.recommendations.map((rec) => `- ${rec}`).join("\n");

  return [
    `**Task Completed:** ${taskName}`,
    "",
    `**Status:** ${statusLabel}`,
    "",
    "**Summary:**",
    input.summary,
    "",
    "**Outputs:**",
    outputs || "- None",
    "",
    "**Metrics:**",
    `- Token Usage: ${input.metrics.tokenUsage ?? input.metrics.tokensUsed ?? "N/A"}`,
    `- Duration (seconds): ${input.metrics.durationSeconds ?? "N/A"}`,
    `- Tests: ${
      input.metrics.testsPassed !== undefined && input.metrics.testsTotal !== undefined
        ? `${input.metrics.testsPassed}/${input.metrics.testsTotal}`
        : "N/A"
    }`,
    `- Build: ${
      input.metrics.buildSuccess === undefined
        ? "N/A"
        : input.metrics.buildSuccess
          ? "success"
          : "failed"
    }`,
    "",
    "**Issues:**",
    issues || "- None",
    "",
    "**Recommendations:**",
    recommendations || "- None",
  ].join("\n");
}

export function collectReportTool(
  deps: CollectReportDependencies
): ToolDefinition<CollectReportInput, CollectedReport> {
  return {
    name: "collect_report",
    description: "Collect a structured execution report and persist status/quality/metrics.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task identifier the report belongs to.",
        },
        status: {
          type: "string",
          enum: ["in_progress", "completed", "failed"],
          description: "Current task status.",
        },
        summary: {
          type: "string",
          description: "Short execution summary.",
        },
        outputs: {
          type: "array",
          items: { type: "string" },
          description: "Artifacts produced during execution.",
        },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Issues discovered while executing the task.",
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Recommended follow-up actions.",
        },
        metrics: {
          type: "object",
          properties: {
            tokenUsage: { type: "number" },
            tokensUsed: { type: "number" },
            durationSeconds: { type: "number" },
            testsPassed: { type: "number" },
            testsTotal: { type: "number" },
            buildSuccess: { type: "boolean" },
          },
        },
        workflowId: {
          type: "string",
          description: "Workflow associated with this task.",
        },
        tokenStage: {
          type: "string",
          enum: ["planning", "execution", "validation", "reporting"],
          description: "Stage bucket for workflow token accounting.",
        },
      },
      required: ["taskId", "summary"],
    },
    schema: collectReportSchema,
    handler: async (input: CollectReportInput): Promise<CollectedReport> => {
      const task = deps.stateManager.getTask(input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      deps.stateManager.attachTaskReport(input.taskId, toReportPayload(input));

      let nextStatus = toTaskStatus(input.status);
      const quality = runQualityGates(
        {
          status: input.status,
          issues: input.issues,
          metrics: {
            testsPassed: input.metrics.testsPassed,
            testsTotal: input.metrics.testsTotal,
            buildSuccess: input.metrics.buildSuccess,
          },
        },
        deps.qualityGates
      );
      if (!quality.passed) {
        nextStatus = "failed";
      }

      const updatedTask = deps.stateManager.updateTaskStatus(input.taskId, nextStatus);

      const tokenUsage = input.metrics.tokenUsage ?? input.metrics.tokensUsed;
      if (tokenUsage !== undefined) {
        deps.stateManager.trackTaskTokenUsage(input.taskId, tokenUsage);
        if (input.workflowId) {
          deps.tokenTracker.trackTokenUsage(
            input.workflowId,
            task.executor,
            input.tokenStage as TokenStage,
            tokenUsage
          );
        }
      }

      if (input.workflowId && input.status !== "in_progress") {
        deps.stateManager.setWorkflowCurrentTask(input.workflowId, null);
        const workflow = deps.stateManager.getWorkflow(input.workflowId);
        if (workflow) {
          const hasFailed = workflow.tasks.some((workflowTask) => workflowTask.status === "failed");
          const hasInProgress = workflow.tasks.some(
            (workflowTask) => workflowTask.status === "pending" || workflowTask.status === "executing"
          );

          if (hasFailed && !hasInProgress) {
            deps.stateManager.failWorkflow(input.workflowId);
          } else if (!hasFailed && !hasInProgress) {
            deps.stateManager.completeWorkflow(input.workflowId);
          }
        }
      }

      return {
        reportId: `report-${Date.now()}`,
        taskId: input.taskId,
        status: input.status,
        summary: input.summary,
        outputs: input.outputs,
        issues: input.issues,
        recommendations: input.recommendations,
        metrics: input.metrics,
        collectedAt: new Date().toISOString(),
        nextAction: nextAction(input.status),
        taskState: {
          status: updatedTask.status as "executing" | "completed" | "failed",
          endTime: updatedTask.endTime,
        },
        formattedReport: formatReportForPlanner(input, task.spec.task),
        quality,
      };
    },
  };
}
