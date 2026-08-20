import { describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG } from "../../src/config/types.js";
import type { AgentExecutionResult, AgentRunner } from "../../src/execution/types.js";
import { StateManager } from "../../src/state/state-manager.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";
import { delegateTaskTool } from "../../src/tools/delegate-task.js";

function seedTask(stateManager: StateManager, id: string, dependsOn?: string[]): void {
  stateManager.createTask({
    id,
    task: "Seed task",
    executor: "gemini",
    template: "typescript-feature",
    dependsOn,
    context: {},
    inputs: {},
    executionSteps: ["step 1"],
    expectedOutputs: [{ name: "out", description: "desc" }],
    successCriteria: ["done"],
    metadata: {
      created: new Date().toISOString(),
    },
  });
}

function seedClaudeTask(stateManager: StateManager, id: string, model?: string): void {
  stateManager.createTask({
    id,
    task: "Seed task",
    executor: "claude",
    model,
    template: "typescript-feature",
    context: {},
    inputs: {},
    executionSteps: ["step 1"],
    expectedOutputs: [{ name: "out", description: "desc" }],
    successCriteria: ["done"],
    metadata: {
      created: new Date().toISOString(),
    },
  });
}

function mockResult(
  agent: "claude" | "gemini" | "codex",
  status: AgentExecutionResult["status"],
  overrides: Partial<AgentExecutionResult> = {}
): AgentExecutionResult {
  const now = new Date().toISOString();
  return {
    agent,
    status,
    exitCode: status === "completed" ? 0 : 1,
    signal: null,
    startedAt: now,
    endedAt: now,
    durationMs: 25,
    stdout: "",
    stderr: "",
    ...overrides,
  };
}

function createMockRunner(results: AgentExecutionResult[]): AgentRunner {
  let index = 0;
  return {
    run: vi.fn(async () => {
      const current = results[Math.min(index, results.length - 1)];
      index += 1;
      return current;
    }),
  };
}

describe("delegateTaskTool", () => {
  it("delegates task with default priority", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-123");
    const tool = delegateTaskTool({ stateManager, roleEnforcer: services.roleEnforcer });
    const input = tool.schema.parse({
      taskId: "task-123",
      executor: "gemini",
    });
    const result = await tool.handler(input);

    expect(result.delegationId).toMatch(/^delegation-/);
    expect(result.priority).toBe("normal");
    expect(result.status).toBe("delegated");
    expect(result.executionMode).toBe("handoff");
    expect(result.formattedTask).toContain("**Task:**");
    expect(stateManager.getTask("task-123")?.status).toBe("executing");
  });

  it("includes optional notes in message", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-456");
    const tool = delegateTaskTool({ stateManager, roleEnforcer: services.roleEnforcer });
    const input = tool.schema.parse({
      taskId: "task-456",
      executor: "gemini",
      notes: "run full QA checks",
    });
    const result = await tool.handler(input);

    expect(result.message).toContain("Notes: run full QA checks");
  });

  it("fails on executor mismatch", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-789");
    const tool = delegateTaskTool({ stateManager, roleEnforcer: services.roleEnforcer });
    const input = tool.schema.parse({
      taskId: "task-789",
      executor: "codex",
    });

    await expect(tool.handler(input)).rejects.toThrow("Task executor mismatch");
  });

  it("attaches and updates workflow current task when workflow id is provided", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    const workflow = stateManager.createWorkflow("wf-delegate");
    seedTask(stateManager, "task-900");
    const tool = delegateTaskTool({ stateManager, roleEnforcer: services.roleEnforcer });

    await tool.handler(
      tool.schema.parse({
        taskId: "task-900",
        executor: "gemini",
        workflowId: workflow.id,
      })
    );

    const updatedWorkflow = stateManager.getWorkflow(workflow.id);
    expect(updatedWorkflow?.status).toBe("in-progress");
    expect(updatedWorkflow?.currentTask).toBe("task-900");
  });

  it("fails for missing task", async () => {
    const services = createOrchestratorServices("templates");
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    await expect(
      tool.handler(
        tool.schema.parse({
          taskId: "missing-task",
          executor: "gemini",
        })
      )
    ).rejects.toThrow("Task not found");
  });

  it("executes subprocess mode and stores normalized report", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-subprocess-ok");
    const runner = createMockRunner([
      mockResult("gemini", "completed", {
        stdout: JSON.stringify({
          summary: "Implemented and tested.",
          outputs: ["src/feature.ts"],
          issues: [],
          recommendations: ["merge"],
          metrics: { tokensUsed: 42, testsPassed: 5, testsTotal: 5, buildSuccess: true },
        }),
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-subprocess-ok",
        executor: "gemini",
        executionMode: "subprocess",
      })
    );

    const task = services.stateManager.getTask("task-subprocess-ok");
    expect(result.status).toBe("completed");
    expect(result.executionMode).toBe("subprocess");
    expect(result.reportSummary).toBe("Implemented and tested.");
    expect(task?.status).toBe("completed");
    expect(task?.report?.summary).toBe("Implemented and tested.");
    expect(task?.tokenUsage?.total).toBe(42);
    expect(task?.executionHistory.length).toBe(1);
  });

  it("falls back to codex when primary executor fails", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-subprocess-fallback");
    const runner = createMockRunner([
      mockResult("gemini", "failed", {
        exitCode: 1,
        stderr: "gemini failed",
      }),
      mockResult("codex", "completed", {
        stdout: '{"summary":"Recovered on fallback","outputs":[],"issues":[],"recommendations":[],"metrics":{}}',
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: true,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-subprocess-fallback",
        executor: "gemini",
        executionMode: "subprocess",
      })
    );

    const task = services.stateManager.getTask("task-subprocess-fallback");
    expect(result.status).toBe("completed");
    expect(result.executor).toBe("codex");
    expect(result.attemptedExecutors).toEqual(["gemini", "codex"]);
    expect(task?.executionHistory.length).toBe(2);
    expect(task?.execution?.agent).toBe("codex");
  });

  it("does not carry a model override meant for the primary executor onto a fallback executor", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-model-fallback-bleed");
    const runner = createMockRunner([
      mockResult("gemini", "failed", {
        exitCode: 1,
        stderr: "gemini failed",
      }),
      mockResult("codex", "completed", {
        stdout: '{"summary":"Recovered on fallback","outputs":[],"issues":[],"recommendations":[],"metrics":{}}',
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: true,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-model-fallback-bleed",
        executor: "gemini",
        executionMode: "subprocess",
        model: "gemini-only-model",
      })
    );

    const runMock = runner.run as unknown as ReturnType<typeof vi.fn>;
    const geminiArgs = runMock.mock.calls[0][0].command.args as string[];
    const codexArgs = runMock.mock.calls[1][0].command.args as string[];

    // gemini has no modelFlag configured in DEFAULT_CONFIG, so the model is
    // never spliced in regardless -- but codex does have one, and must not
    // receive a model name that was only ever meant for gemini.
    expect(codexArgs).not.toContain("gemini-only-model");
    expect(geminiArgs).not.toContain("gemini-only-model");

    expect(result.status).toBe("completed");
    expect(result.execution?.model).toBeUndefined();

    const task = services.stateManager.getTask("task-model-fallback-bleed");
    expect(task?.executionHistory[0]?.model).toBeUndefined();
    expect(task?.executionHistory[1]?.model).toBeUndefined();
  });

  it("marks task failed when all subprocess attempts fail", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-subprocess-fail");
    const runner = createMockRunner([
      mockResult("gemini", "timed_out", {
        error: "Process timed out.",
      }),
      mockResult("codex", "failed", {
        exitCode: 1,
        stderr: "fallback failed",
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: true,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-subprocess-fail",
        executor: "gemini",
        executionMode: "subprocess",
      })
    );

    const task = services.stateManager.getTask("task-subprocess-fail");
    expect(result.status).toBe("failed");
    expect(task?.status).toBe("failed");
    expect(task?.report?.summary).toContain("failed");
    expect(task?.executionHistory.length).toBe(2);
  });

  it("refuses delegation when a dependency is not yet completed", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-dep-base");
    seedTask(services.stateManager, "task-dep-child", ["task-dep-base"]);
    const tool = delegateTaskTool({ stateManager: services.stateManager, roleEnforcer: services.roleEnforcer });

    await expect(
      tool.handler(
        tool.schema.parse({
          taskId: "task-dep-child",
          executor: "gemini",
        })
      )
    ).rejects.toThrow("blocked on incomplete dependencies: task-dep-base");
  });

  it("allows delegation once all dependencies are completed", async () => {
    const services = createOrchestratorServices("templates");
    seedTask(services.stateManager, "task-dep-base-2");
    seedTask(services.stateManager, "task-dep-child-2", ["task-dep-base-2"]);
    services.stateManager.updateTaskStatus("task-dep-base-2", "completed");
    const tool = delegateTaskTool({ stateManager: services.stateManager, roleEnforcer: services.roleEnforcer });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-dep-child-2",
        executor: "gemini",
      })
    );

    expect(result.status).toBe("delegated");
  });

  it("applies a call-time model override to the executed command and records it", async () => {
    const services = createOrchestratorServices("templates", {
      ...DEFAULT_CONFIG,
      roleBoundaries: { ...DEFAULT_CONFIG.roleBoundaries, enforce: false },
    });
    seedClaudeTask(services.stateManager, "task-model-override", "task-spec-model");
    const runner = createMockRunner([
      mockResult("claude", "completed", {
        stdout: '{"summary":"done","outputs":[],"issues":[],"recommendations":[],"metrics":{}}',
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-model-override",
        executor: "claude",
        executionMode: "subprocess",
        model: "call-time-model",
      })
    );

    const runMock = runner.run as unknown as ReturnType<typeof vi.fn>;
    const calledArgs = runMock.mock.calls[0][0].command.args as string[];
    expect(calledArgs).toEqual(expect.arrayContaining(["--model", "call-time-model"]));
    expect(calledArgs).not.toContain("task-spec-model");
    expect(result.execution?.model).toBe("call-time-model");

    const task = services.stateManager.getTask("task-model-override");
    expect(task?.execution?.model).toBe("call-time-model");
    expect(task?.report?.model).toBe("call-time-model");
  });

  it("falls back to the task spec's model when no call-time model is given", async () => {
    const services = createOrchestratorServices("templates", {
      ...DEFAULT_CONFIG,
      roleBoundaries: { ...DEFAULT_CONFIG.roleBoundaries, enforce: false },
    });
    seedClaudeTask(services.stateManager, "task-model-spec", "task-spec-model");
    const runner = createMockRunner([
      mockResult("claude", "completed", {
        stdout: '{"summary":"done","outputs":[],"issues":[],"recommendations":[],"metrics":{}}',
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-model-spec",
        executor: "claude",
        executionMode: "subprocess",
      })
    );

    const runMock = runner.run as unknown as ReturnType<typeof vi.fn>;
    const calledArgs = runMock.mock.calls[0][0].command.args as string[];
    expect(calledArgs).toEqual(expect.arrayContaining(["--model", "task-spec-model"]));
    expect(result.execution?.model).toBe("task-spec-model");
  });

  it("omits the model flag when no model is requested at all", async () => {
    const services = createOrchestratorServices("templates", {
      ...DEFAULT_CONFIG,
      roleBoundaries: { ...DEFAULT_CONFIG.roleBoundaries, enforce: false },
    });
    seedClaudeTask(services.stateManager, "task-model-none");
    const runner = createMockRunner([
      mockResult("claude", "completed", {
        stdout: '{"summary":"done","outputs":[],"issues":[],"recommendations":[],"metrics":{}}',
      }),
    ]);
    const tool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await tool.handler(
      tool.schema.parse({
        taskId: "task-model-none",
        executor: "claude",
        executionMode: "subprocess",
      })
    );

    const runMock = runner.run as unknown as ReturnType<typeof vi.fn>;
    const calledArgs = runMock.mock.calls[0][0].command.args as string[];
    expect(calledArgs).not.toContain("--model");
    expect(result.execution?.model).toBeUndefined();
  });

  it("rejects an empty-string model at the schema boundary", () => {
    expect(() =>
      delegateTaskTool({
        stateManager: new StateManager(),
        roleEnforcer: {} as never,
      }).schema.parse({
        taskId: "task-empty-model",
        executor: "claude",
        model: "",
      })
    ).toThrow();
  });
});
