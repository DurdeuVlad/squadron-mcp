import { z } from "zod";

import { type StateManager } from "../state/state-manager.js";
import type { TaskStatus } from "../state/types.js";
import type { ToolDefinition } from "./types.js";

const trackWorkflowSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
});

export type TrackWorkflowInput = z.infer<typeof trackWorkflowSchema>;

export interface TrackWorkflowResult {
  workflowId: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  progress: {
    total: number;
    completed: number;
    executing: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  tokenUsage: {
    planning: number;
    execution: number;
    validation: number;
    reporting: number;
    total: number;
  };
  currentTask: string | null;
  tasks: Array<{
    id: string;
    status: TaskStatus;
    readiness: "ready" | "blocked";
    blockedBy?: string[];
  }>;
  summary: string;
}

export interface TrackWorkflowDependencies {
  stateManager: StateManager;
}

export function trackWorkflowTool(
  deps: TrackWorkflowDependencies
): ToolDefinition<TrackWorkflowInput, TrackWorkflowResult> {
  return {
    name: "track_workflow",
    description: "Return workflow progress, task status breakdown, and token metrics.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "Workflow identifier to inspect.",
        },
      },
      required: ["workflowId"],
    },
    schema: trackWorkflowSchema,
    handler: async (input: TrackWorkflowInput): Promise<TrackWorkflowResult> => {
      const workflow = deps.stateManager.getWorkflow(input.workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${input.workflowId}`);
      }

      const progress = {
        total: workflow.tasks.length,
        completed: workflow.tasks.filter((task) => task.status === "completed").length,
        executing: workflow.tasks.filter((task) => task.status === "executing").length,
        pending: workflow.tasks.filter((task) => task.status === "pending").length,
        failed: workflow.tasks.filter((task) => task.status === "failed").length,
        cancelled: workflow.tasks.filter((task) => task.status === "cancelled").length,
      };

      const tasks = workflow.tasks.map((task) => {
        const blockedBy = deps.stateManager.getUnmetDependencies(task.id);
        return {
          id: task.id,
          status: task.status,
          readiness: (blockedBy.length > 0 ? "blocked" : "ready") as "ready" | "blocked",
          blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
        };
      });

      const taskLines = tasks
        .map((task) => {
          const readinessNote =
            task.readiness === "blocked"
              ? ` [blocked, waiting on: ${task.blockedBy?.join(", ")}]`
              : "";
          return `- ${task.id}: ${task.status}${readinessNote}`;
        })
        .join("\n");
      const summary = [
        `Workflow ${workflow.id} (${workflow.status})`,
        `Completed: ${progress.completed}/${progress.total}`,
        `Executing: ${progress.executing}`,
        `Pending: ${progress.pending}`,
        `Failed: ${progress.failed}`,
        `Cancelled: ${progress.cancelled}`,
        `Total tokens: ${workflow.tokenUsage.total}`,
        "Tasks:",
        taskLines || "- No tasks",
      ].join("\n");

      return {
        workflowId: workflow.id,
        status: workflow.status,
        progress,
        tokenUsage: workflow.tokenUsage,
        currentTask: workflow.currentTask,
        tasks,
        summary,
      };
    },
  };
}
