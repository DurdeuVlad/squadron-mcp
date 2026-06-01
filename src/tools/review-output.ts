import { z } from "zod";

import { type StateManager } from "../state/state-manager.js";
import type { ReviewDecision } from "../state/types.js";
import type { ToolDefinition } from "./types.js";

const reviewOutputSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
  criteria: z.array(z.string()).default([]),
  decision: z.enum(["approve", "revise", "reject"]),
  feedback: z.string().optional(),
  reviewer: z.string().min(1, "reviewer is required"),
});

export type ReviewOutputInput = z.infer<typeof reviewOutputSchema>;

export interface ReviewOutputResult {
  taskId: string;
  decision: ReviewDecision;
  reviewer: string;
  feedback?: string;
  taskStatus: "completed" | "pending" | "failed";
  reviewRecordedAt: string;
  message: string;
}

export interface ReviewOutputDependencies {
  stateManager: StateManager;
}

function formatReviewResponse(decision: ReviewDecision, feedback?: string): string {
  if (decision === "approve") {
    return "Review approved. Task meets criteria and can proceed.";
  }

  if (decision === "revise") {
    return `Revision requested.${feedback ? ` ${feedback}` : ""}`;
  }

  return `Review rejected.${feedback ? ` ${feedback}` : ""}`;
}

export function reviewOutputTool(
  deps: ReviewOutputDependencies
): ToolDefinition<ReviewOutputInput, ReviewOutputResult> {
  return {
    name: "review_output",
    description: "Review task output, record decision, and update task status.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task to review." },
        criteria: {
          type: "array",
          items: { type: "string" },
          description: "Criteria used for review.",
        },
        decision: {
          type: "string",
          enum: ["approve", "revise", "reject"],
          description: "Review decision.",
        },
        feedback: {
          type: "string",
          description: "Optional feedback for executor.",
        },
        reviewer: {
          type: "string",
          description: "Reviewer identity.",
        },
      },
      required: ["taskId", "decision", "reviewer"],
    },
    schema: reviewOutputSchema,
    handler: async (input: ReviewOutputInput): Promise<ReviewOutputResult> => {
      const task = deps.stateManager.getTask(input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      if (!task.report) {
        throw new Error(`No report found for task: ${input.taskId}`);
      }

      const reviewRecordedAt = new Date().toISOString();
      deps.stateManager.attachTaskReview(input.taskId, {
        reviewer: input.reviewer,
        criteria: input.criteria,
        decision: input.decision,
        feedback: input.feedback,
        timestamp: reviewRecordedAt,
      });

      if (input.decision === "approve") {
        deps.stateManager.updateTaskStatus(input.taskId, "completed");
      } else if (input.decision === "revise") {
        deps.stateManager.updateTaskStatus(input.taskId, "pending");
      } else {
        deps.stateManager.updateTaskStatus(input.taskId, "failed");
      }

      const updatedTask = deps.stateManager.getTask(input.taskId);
      if (!updatedTask) {
        throw new Error(`Task not found after review update: ${input.taskId}`);
      }

      return {
        taskId: input.taskId,
        decision: input.decision,
        reviewer: input.reviewer,
        feedback: input.feedback,
        taskStatus: updatedTask.status as "completed" | "pending" | "failed",
        reviewRecordedAt,
        message: formatReviewResponse(input.decision, input.feedback),
      };
    },
  };
}
