import { z } from "zod";

import { type RoleEnforcer } from "../enforcement/role-enforcer.js";
import { StateManager } from "../state/state-manager.js";
import { TokenTracker } from "../metrics/token-tracker.js";
import type { ToolDefinition } from "./types.js";

const optimizeTokensSchema = z.object({
  workflowId: z.string().optional(),
  timeRange: z.string().optional(),
});

export type OptimizeTokensInput = z.infer<typeof optimizeTokensSchema>;

export interface OptimizeTokensResult {
  scope: "workflow" | "all";
  workflowId?: string;
  report: string;
  recommendations: string[];
}

export interface OptimizeTokensDependencies {
  stateManager: StateManager;
  tokenTracker: TokenTracker;
  roleEnforcer: RoleEnforcer;
}

function optimizeWorkflow(
  workflowId: string,
  stateManager: StateManager,
  tokenTracker: TokenTracker,
  roleEnforcer: RoleEnforcer
): OptimizeTokensResult {
  const workflow = stateManager.getWorkflow(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const recommendations: string[] = [];
  const byTemplate = new Map<string, number>();

  for (const task of workflow.tasks) {
    const role = roleEnforcer.getAgentRole(task.executor);
    if (role === "planner") {
      recommendations.push(
        `Task ${task.id} executed by planner (${task.executor}). Delegate to an executor for lower token cost.`
      );
    }

    byTemplate.set(task.spec.template, (byTemplate.get(task.spec.template) ?? 0) + 1);
  }

  for (const [template, count] of byTemplate.entries()) {
    if (count >= 3) {
      recommendations.push(
        `Template "${template}" appears ${count} times. Consider batching these tasks.`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("No major optimization opportunities found.");
  }

  return {
    scope: "workflow",
    workflowId,
    report: tokenTracker.generateReport(workflowId),
    recommendations,
  };
}

function optimizeAll(
  stateManager: StateManager,
  tokenTracker: TokenTracker,
  roleEnforcer: RoleEnforcer
): OptimizeTokensResult {
  const workflows = stateManager.listWorkflows();
  if (workflows.length === 0) {
    return {
      scope: "all",
      report: "No workflows found.",
      recommendations: ["Create and execute a workflow before running optimization."],
    };
  }

  const recommendations: string[] = [];
  let totalTokens = 0;
  let totalSavings = 0;
  let plannerExecutions = 0;

  for (const workflow of workflows) {
    const metrics = tokenTracker.calculateSavings(workflow.id);
    totalTokens += metrics.totalTokens;
    totalSavings += metrics.savingsVsBaseline;

    for (const task of workflow.tasks) {
      if (roleEnforcer.getAgentRole(task.executor) === "planner") {
        plannerExecutions += 1;
      }
    }
  }

  if (plannerExecutions > 0) {
    recommendations.push(
      `${plannerExecutions} task(s) were executed by planner roles. Reassign to executors where possible.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Workflow portfolio is within expected optimization bounds.");
  }

  const report = [
    "**Portfolio Token Optimization Report**",
    "",
    `Workflows analyzed: ${workflows.length}`,
    `Total tokens: ${totalTokens}`,
    `Aggregate savings vs baseline: ${totalSavings}`,
  ].join("\n");

  return {
    scope: "all",
    report,
    recommendations,
  };
}

export function optimizeTokensTool(
  deps: OptimizeTokensDependencies
): ToolDefinition<OptimizeTokensInput, OptimizeTokensResult> {
  return {
    name: "optimize_tokens",
    description: "Analyze workflow token usage and recommend optimization opportunities.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "Optional workflow ID to optimize.",
        },
        timeRange: {
          type: "string",
          description: "Optional time window identifier such as last-24h.",
        },
      },
    },
    schema: optimizeTokensSchema,
    handler: async (input: OptimizeTokensInput): Promise<OptimizeTokensResult> => {
      if (input.workflowId) {
        return optimizeWorkflow(
          input.workflowId,
          deps.stateManager,
          deps.tokenTracker,
          deps.roleEnforcer
        );
      }

      return optimizeAll(deps.stateManager, deps.tokenTracker, deps.roleEnforcer);
    },
  };
}
