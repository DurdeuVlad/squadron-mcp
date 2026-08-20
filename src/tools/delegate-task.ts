import { z } from "zod";

import {
  DEFAULT_CONFIG,
  DelegationRuntimeSchema,
  type AgentName,
  type DelegationRuntime,
} from "../config/types.js";
import { ProcessAgentRunner } from "../execution/agent-runner.js";
import { buildCommand, buildExecutorPrompt } from "../execution/prompt-builder.js";
import { normalizeExecutorReport } from "../execution/report-normalizer.js";
import type { AgentExecutionResult, AgentRunner, ExecutionStatus } from "../execution/types.js";
import { TerminalSessionManager } from "../execution/session-manager.js";
import { type RoleEnforcer } from "../enforcement/role-enforcer.js";
import { type StateManager } from "../state/state-manager.js";
import { log } from "../utils/logger.js";
import type { ToolDefinition } from "./types.js";
import type { InteractiveSessionConfig } from "../config/types.js";

const delegateTaskSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
  executor: z.enum(["claude", "gemini", "codex"]),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  notes: z.string().optional(),
  workflowId: z.string().optional(),
  planner: z.string().default("claude"),
  executionMode: z.enum(["auto", "handoff", "subprocess"]).default("auto"),
  timeoutMs: z.number().int().positive().optional(),
  model: z.string().min(1).optional(),
});

export type DelegateTaskInput = z.infer<typeof delegateTaskSchema>;

export interface DelegationResult {
  delegationId: string;
  taskId: string;
  executor: AgentName;
  priority: "low" | "normal" | "high";
  status: "delegated" | "completed" | "failed";
  message: string;
  handedOffAt: string;
  taskState: {
    status: "executing" | "completed" | "failed";
    startTime?: string;
    endTime?: string;
  };
  formattedTask: string;
  executionMode: "handoff" | "subprocess";
  attemptedExecutors?: AgentName[];
  execution?: {
    status: ExecutionStatus;
    agent: AgentName;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    durationMs: number;
    startedAt: string;
    endedAt: string;
    fallbackFrom?: AgentName;
    error?: string;
    model?: string;
  };
  reportSummary?: string;
  reportParser?: "json" | "fenced-json" | "embedded-json" | "plain-text";
}

export interface DelegateTaskDependencies {
  stateManager: StateManager;
  roleEnforcer: RoleEnforcer;
  delegationRuntime?: DelegationRuntime;
  agentRunner?: AgentRunner;
  sessionManager?: TerminalSessionManager;
}

function shouldRunSubprocess(
  inputMode: DelegateTaskInput["executionMode"],
  runtime: DelegationRuntime
): boolean {
  if (inputMode === "handoff") {
    return false;
  }
  if (inputMode === "subprocess") {
    return true;
  }
  return runtime.enabled;
}

function determineExecutionStrategy(
  inputMode: DelegateTaskInput["executionMode"],
  runtime: DelegationRuntime
): "interactive" | "oneshot" {
  if (inputMode === "handoff") {
    return "oneshot";
  }
  
  const mode = runtime.executionMode ?? "oneshot";
  
  if (mode === "interactive") {
    return "interactive";
  }
  
  if (mode === "auto" && runtime.interactive?.enabled) {
    return "interactive";
  }
  
  return "oneshot";
}

function createSessionManager(config: InteractiveSessionConfig): TerminalSessionManager {
  return new TerminalSessionManager({
    sessionIdleTimeoutMs: config.sessionIdleTimeoutMs,
    sessionMaxAgeMs: config.sessionMaxAgeMs,
    healthCheckIntervalMs: config.healthCheckIntervalMs,
    maxConsecutiveFailures: config.maxConsecutiveFailures,
    agents: {
      claude: {
        command: config.agents.claude.command,
        shell: config.agents.claude.shell,
        startupArgs: config.agents.claude.startupArgs,
        completionMarker: config.agents.claude.completionMarker,
        completionTimeoutMs: config.agents.claude.completionTimeoutMs,
        errorPatterns: config.agents.claude.errorPatterns,
      },
      gemini: {
        command: config.agents.gemini.command,
        shell: config.agents.gemini.shell,
        startupArgs: config.agents.gemini.startupArgs,
        completionMarker: config.agents.gemini.completionMarker,
        completionTimeoutMs: config.agents.gemini.completionTimeoutMs,
        errorPatterns: config.agents.gemini.errorPatterns,
      },
      codex: {
        command: config.agents.codex.command,
        shell: config.agents.codex.shell,
        startupArgs: config.agents.codex.startupArgs,
        completionMarker: config.agents.codex.completionMarker,
        completionTimeoutMs: config.agents.codex.completionTimeoutMs,
        errorPatterns: config.agents.codex.errorPatterns,
      },
    },
  });
}

function resolveExecutorChain(primary: AgentName, runtime: DelegationRuntime): AgentName[] {
  const chain: AgentName[] = [primary];
  if (!runtime.fallbackOnFailure) {
    return chain;
  }

  for (const fallback of runtime.fallbackExecutors[primary]) {
    if (!chain.includes(fallback)) {
      chain.push(fallback);
    }
  }

  return chain;
}

function settleWorkflowAfterTask(stateManager: StateManager, workflowId?: string): void {
  if (!workflowId) {
    return;
  }

  stateManager.setWorkflowCurrentTask(workflowId, null);
  const workflow = stateManager.getWorkflow(workflowId);
  if (!workflow) {
    return;
  }

  const hasFailed = workflow.tasks.some((workflowTask) => workflowTask.status === "failed");
  const hasInProgress = workflow.tasks.some(
    (workflowTask) => workflowTask.status === "pending" || workflowTask.status === "executing"
  );

  if (hasFailed && !hasInProgress) {
    stateManager.failWorkflow(workflowId);
  } else if (!hasFailed && !hasInProgress) {
    stateManager.completeWorkflow(workflowId);
  }
}

function toExecutionMetadata(
  attempt: AgentExecutionResult,
  attemptNumber: number,
  fallbackFrom?: AgentName,
  model?: string
): {
  status: "completed" | "failed" | "timed_out";
  agent: AgentName;
  attempt: number;
  model?: string;
  fallbackFrom?: AgentName;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: string;
} {
  return {
    status: attempt.status,
    agent: attempt.agent,
    attempt: attemptNumber,
    model,
    fallbackFrom,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    durationMs: attempt.durationMs,
    exitCode: attempt.exitCode,
    signal: attempt.signal,
    stdout: attempt.stdout,
    stderr: attempt.stderr,
    error: attempt.error,
  };
}

function toFinalExecutionOutput(
  attempt: AgentExecutionResult,
  primary: AgentName,
  model?: string
): {
  status: ExecutionStatus;
  agent: AgentName;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  startedAt: string;
  endedAt: string;
  fallbackFrom?: AgentName;
  error?: string;
  model?: string;
} {
  return {
    status: attempt.status,
    agent: attempt.agent,
    exitCode: attempt.exitCode,
    signal: attempt.signal,
    durationMs: attempt.durationMs,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    fallbackFrom: attempt.agent !== primary ? primary : undefined,
    error: attempt.error,
    model,
  };
}

export function delegateTaskTool(
  deps: DelegateTaskDependencies
): ToolDefinition<DelegateTaskInput, DelegationResult> {
  const runner = deps.agentRunner ?? new ProcessAgentRunner();
  const runtime = DelegationRuntimeSchema.parse(
    deps.delegationRuntime ?? DEFAULT_CONFIG.delegationRuntime ?? {}
  );

  return {
    name: "delegate_task",
    description: "Delegate an existing task to an executor and update orchestration state.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task identifier from create_task_spec.",
        },
        executor: {
          type: "string",
          enum: ["claude", "gemini", "codex"],
          description: "Agent that should execute the task.",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"],
          description: "Execution priority.",
        },
        notes: {
          type: "string",
          description: "Optional coordination notes.",
        },
        workflowId: {
          type: "string",
          description: "Optional workflow to attach this task to if not already linked.",
        },
        planner: {
          type: "string",
          description: "Planner that initiated this delegation.",
        },
        executionMode: {
          type: "string",
          enum: ["auto", "handoff", "subprocess"],
          description: "Execution mode override. auto uses configured runtime behavior.",
        },
        timeoutMs: {
          type: "number",
          description: "Optional subprocess timeout override in milliseconds.",
        },
        model: {
          type: "string",
          description:
            "Optional model override for this delegation (e.g. 'sonnet', 'opus', 'o3'). Overrides the task spec's model if both are set. Only applied for executors with a configured modelFlag; ignored otherwise.",
        },
      },
      required: ["taskId", "executor"],
    },
    schema: delegateTaskSchema,
    handler: async (input: DelegateTaskInput): Promise<DelegationResult> => {
      const task = deps.stateManager.getTask(input.taskId);
      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      if (task.spec.executor !== input.executor) {
        throw new Error(
          `Task executor mismatch. Expected: ${task.spec.executor}, got: ${input.executor}.`
        );
      }

      deps.roleEnforcer.enforceTaskDelegation(input.planner, input.executor, task.spec.task);

      if (input.workflowId) {
        deps.stateManager.addTaskToWorkflow(input.workflowId, input.taskId);
        deps.stateManager.setWorkflowCurrentTask(input.workflowId, input.taskId);
      }

      const executing = deps.stateManager.updateTaskStatus(input.taskId, "executing");
      const detail = input.notes ? ` Notes: ${input.notes}` : "";
      const formattedTask = formatTaskForExecutor(task.spec);
      const handedOffAt = new Date().toISOString();

      if (!shouldRunSubprocess(input.executionMode, runtime)) {
        return {
          delegationId: `delegation-${Date.now()}`,
          taskId: input.taskId,
          executor: input.executor,
          priority: input.priority,
          status: "delegated",
          message: `Task ${input.taskId} delegated to ${input.executor}.${detail}`,
          handedOffAt,
          taskState: {
            status: "executing",
            startTime: executing.startTime,
          },
          formattedTask,
          executionMode: "handoff",
        };
      }

      const prompt = buildExecutorPrompt({
        taskName: task.spec.task,
        formattedTask,
      }).prompt;

      const executorChain = resolveExecutorChain(input.executor, runtime);
      const attemptedExecutors: AgentName[] = [];
      let finalAttempt: AgentExecutionResult | undefined;
      let finalAttemptModel: string | undefined;
      const strategy = determineExecutionStrategy(input.executionMode, runtime);
      const resolvedModel = input.model ?? task.spec.model;

      for (const [index, currentExecutor] of executorChain.entries()) {
        attemptedExecutors.push(currentExecutor);
        // Model names are provider-specific. Only apply the requested model to the
        // executor the caller actually asked for it on -- a fallback attempt on a
        // different executor should use that executor's own default, not risk
        // failing on an unrecognized model name for the provider it was never meant for.
        const attemptModel = currentExecutor === input.executor ? resolvedModel : undefined;
        log("info", "delegate.subprocess.start", {
          taskId: input.taskId,
          planner: input.planner,
          requestedExecutor: input.executor,
          executor: currentExecutor,
          attempt: index + 1,
          strategy,
        });

        let attempt: AgentExecutionResult;
        // Only set when a model override was actually spliced into the real command --
        // interactive sessions have no per-call model override mechanism, and an
        // executor with no modelFlag configured never gets one spliced in either,
        // regardless of attemptModel.
        let appliedModel: string | undefined;

        if (strategy === "interactive" && runtime.interactive) {
          try {
            const sessionManager = deps.sessionManager ?? createSessionManager(runtime.interactive);
            attempt = await sessionManager.execute(
              currentExecutor,
              prompt,
              { timeoutMs: input.timeoutMs ?? runtime.interactive.agents[currentExecutor].completionTimeoutMs }
            );
          } catch (error) {
            log("warn", "delegate.interactive.fallback", {
              executor: currentExecutor,
              error: (error as Error).message,
            });
            // Fall back to one-shot for this attempt
            const commandConfig = runtime.agents[currentExecutor];
            const builtCommand = buildCommand(commandConfig, prompt, { model: attemptModel });
            appliedModel = attemptModel && commandConfig.modelFlag ? attemptModel : undefined;
            attempt = await runner.run({
              agent: currentExecutor,
              command: builtCommand,
              timeoutMs: input.timeoutMs ?? runtime.defaultTimeoutMs,
              maxOutputBytes: runtime.maxOutputBytes,
            });
          }
        } else {
          const commandConfig = runtime.agents[currentExecutor];
          const builtCommand = buildCommand(commandConfig, prompt, { model: attemptModel });
          appliedModel = attemptModel && commandConfig.modelFlag ? attemptModel : undefined;
          attempt = await runner.run({
            agent: currentExecutor,
            command: builtCommand,
            timeoutMs: input.timeoutMs ?? runtime.defaultTimeoutMs,
            maxOutputBytes: runtime.maxOutputBytes,
          });
        }

        finalAttempt = attempt;
        finalAttemptModel = appliedModel;

        deps.stateManager.attachTaskExecution(
          input.taskId,
          toExecutionMetadata(attempt, index + 1, index > 0 ? input.executor : undefined, appliedModel)
        );

        log("info", "delegate.subprocess.end", {
          taskId: input.taskId,
          executor: currentExecutor,
          status: attempt.status,
          exitCode: attempt.exitCode,
          durationMs: attempt.durationMs,
        });

        if (attempt.status !== "completed") {
          continue;
        }

        const normalized = normalizeExecutorReport(
          attempt.stdout,
          attempt.stderr,
          `Task ${task.spec.task} completed by ${currentExecutor}.`
        );
        deps.stateManager.attachTaskReport(input.taskId, {
          summary: normalized.summary,
          outputs: normalized.outputs,
          issues: normalized.issues,
          recommendations: normalized.recommendations,
          metrics: normalized.metrics,
          parser: normalized.parser,
          rawOutput: normalized.rawOutput,
          stderr: attempt.stderr,
          executor: currentExecutor,
          model: appliedModel,
          collectedAt: new Date().toISOString(),
        });

        const tokenUsage = normalized.metrics.tokenUsage ?? normalized.metrics.tokensUsed;
        if (tokenUsage !== undefined) {
          deps.stateManager.trackTaskTokenUsage(input.taskId, tokenUsage);
          if (input.workflowId) {
            deps.stateManager.trackWorkflowTokenUsage(input.workflowId, "execution", tokenUsage);
          }
        }

        const completed = deps.stateManager.updateTaskStatus(input.taskId, "completed");
        settleWorkflowAfterTask(deps.stateManager, input.workflowId);
        return {
          delegationId: `delegation-${Date.now()}`,
          taskId: input.taskId,
          executor: currentExecutor,
          priority: input.priority,
          status: "completed",
          message: `Task ${input.taskId} executed by ${currentExecutor}.${detail}`,
          handedOffAt,
          taskState: {
            status: "completed",
            startTime: completed.startTime,
            endTime: completed.endTime,
          },
          formattedTask,
          executionMode: "subprocess",
          attemptedExecutors,
          execution: toFinalExecutionOutput(attempt, input.executor, appliedModel),
          reportSummary: normalized.summary,
          reportParser: normalized.parser,
        };
      }

      const failed = deps.stateManager.updateTaskStatus(input.taskId, "failed");
      settleWorkflowAfterTask(deps.stateManager, input.workflowId);
      if (finalAttempt) {
        deps.stateManager.attachTaskReport(input.taskId, {
          summary: `Executor subprocess failed for task ${task.spec.task}.`,
          outputs: [],
          issues: [finalAttempt.error ?? `Exit code ${finalAttempt.exitCode ?? "unknown"}`],
          recommendations: [
            "Inspect stderr/stdout and retry delegation with adjusted prompt or executor.",
          ],
          metrics: {
            durationSeconds: Number((finalAttempt.durationMs / 1000).toFixed(3)),
          },
          rawOutput: finalAttempt.stdout,
          stderr: finalAttempt.stderr,
          executor: finalAttempt.agent,
          model: finalAttemptModel,
          collectedAt: new Date().toISOString(),
        });
      }

      return {
        delegationId: `delegation-${Date.now()}`,
        taskId: input.taskId,
        executor: finalAttempt?.agent ?? input.executor,
        priority: input.priority,
        status: "failed",
        message: `Task ${input.taskId} subprocess execution failed.${detail}`,
        handedOffAt,
        taskState: {
          status: "failed",
          startTime: failed.startTime,
          endTime: failed.endTime,
        },
        formattedTask,
        executionMode: "subprocess",
        attemptedExecutors,
        execution: finalAttempt
          ? toFinalExecutionOutput(finalAttempt, input.executor, finalAttemptModel)
          : undefined,
      };
    },
  };
}

function formatTaskForExecutor(spec: {
  id: string;
  task: string;
  context: Record<string, unknown>;
  inputs: Record<string, unknown>;
  executionSteps: string[];
  expectedOutputs: Array<{ name: string; description: string; type?: string }>;
  successCriteria: string[];
}): string {
  const inputs = Object.entries(spec.inputs)
    .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
    .join("\n");

  const steps = spec.executionSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const outputs = spec.expectedOutputs
    .map((output) => `- ${output.name}: ${output.description}`)
    .join("\n");
  const criteria = spec.successCriteria.map((item) => `- ${item}`).join("\n");
  const contextText =
    Object.keys(spec.context).length > 0 ? JSON.stringify(spec.context, null, 2) : "None";

  return [
    `**Task:** ${spec.task}`,
    "",
    `**Task ID:** ${spec.id}`,
    "",
    `**Context:** ${contextText}`,
    "",
    "**Inputs:**",
    inputs || "- None",
    "",
    "**Execution Steps:**",
    steps || "1. No execution steps provided.",
    "",
    "**Expected Outputs:**",
    outputs || "- None",
    "",
    "**Success Criteria:**",
    criteria || "- None",
    "",
    "---",
    "",
    "**Instructions for Executor:**",
    "1. Follow execution steps in order.",
    "2. Validate against success criteria.",
    "3. Generate a structured report when complete.",
    "4. Submit report using `collect_report`.",
  ].join("\n");
}
