import { describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG } from "../../src/config/types.js";
import type { AgentExecutionResult, AgentRunner } from "../../src/execution/types.js";
import { createTaskSpecTool } from "../../src/tools/create-task-spec.js";
import { delegateTaskTool } from "../../src/tools/delegate-task.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";

function mockRunner(result: AgentExecutionResult): AgentRunner {
  return {
    run: vi.fn(async () => result),
  };
}

describe("subprocess delegation integration (create -> delegate -> verify)", () => {
  it("creates a task, delegates it via a one-shot subprocess, and persists the normalized report", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();

    const createTool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });
    const created = await createTool.handler(
      createTool.schema.parse({
        task: "Add a health check endpoint",
        inputs: {
          feature: "Add a health check endpoint",
          files: ["src/index.ts"],
        },
      })
    );
    expect(services.stateManager.getTask(created.taskId)?.status).toBe("pending");

    const runner = mockRunner({
      agent: created.executor,
      status: "completed",
      exitCode: 0,
      signal: null,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 50,
      stdout: JSON.stringify({
        summary: "Added GET /health returning 200.",
        outputs: ["src/index.ts"],
        issues: [],
        recommendations: [],
        metrics: { tokensUsed: 77, testsPassed: 1, testsTotal: 1, buildSuccess: true },
      }),
      stderr: "",
    });

    const delegateTool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await delegateTool.handler(
      delegateTool.schema.parse({
        taskId: created.taskId,
        executor: created.executor,
        executionMode: "subprocess",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.executionMode).toBe("subprocess");
    expect(runner.run).toHaveBeenCalledTimes(1);

    const task = services.stateManager.getTask(created.taskId);
    expect(task?.status).toBe("completed");
    expect(task?.report?.summary).toBe("Added GET /health returning 200.");
    expect(task?.tokenUsage?.total).toBe(77);
    expect(task?.executionHistory.length).toBe(1);
    expect(task?.executionHistory[0]?.status).toBe("completed");
    expect(task?.executionHistory[0]?.agent).toBe(created.executor);
  });

  it("marks the task failed and preserves failure history when the subprocess exits non-zero", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();

    const createTool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });
    const created = await createTool.handler(
      createTool.schema.parse({
        task: "Refactor the report normalizer",
        inputs: {
          feature: "Refactor the report normalizer",
          files: ["src/execution/report-normalizer.ts"],
        },
      })
    );

    const runner = mockRunner({
      agent: created.executor,
      status: "failed",
      exitCode: 1,
      signal: null,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 30,
      stdout: "",
      stderr: "command not found",
    });

    const delegateTool = delegateTaskTool({
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
      delegationRuntime: {
        ...DEFAULT_CONFIG.delegationRuntime,
        enabled: true,
        fallbackOnFailure: false,
      },
      agentRunner: runner,
    });

    const result = await delegateTool.handler(
      delegateTool.schema.parse({
        taskId: created.taskId,
        executor: created.executor,
        executionMode: "subprocess",
      })
    );

    expect(result.status).toBe("failed");

    const task = services.stateManager.getTask(created.taskId);
    expect(task?.status).toBe("failed");
    expect(task?.executionHistory.length).toBe(1);
    expect(task?.executionHistory[0]?.status).toBe("failed");
  });
});
