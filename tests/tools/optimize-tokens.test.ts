import { describe, expect, it } from "vitest";

import { createOrchestratorServices } from "../../src/tools/registry.js";
import { optimizeTokensTool } from "../../src/tools/optimize-tokens.js";

describe("optimizeTokensTool", () => {
  it("optimizes a workflow", async () => {
    const services = createOrchestratorServices("templates");
    const workflow = services.stateManager.createWorkflow("optimize");
    services.stateManager.createTask({
      id: "task-1",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: {
        created: new Date().toISOString(),
      },
    });
    services.stateManager.addTaskToWorkflow(workflow.id, "task-1");
    services.stateManager.trackTaskTokenUsage("task-1", 80);
    services.tokenTracker.trackTokenUsage(workflow.id, "gemini", "execution", 80);

    const tool = optimizeTokensTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler({ workflowId: workflow.id });
    expect(result.scope).toBe("workflow");
    expect(result.report).toContain("Token Usage Report");
  });

  it("returns portfolio analysis when no workflowId provided", async () => {
    const services = createOrchestratorServices("templates");
    const tool = optimizeTokensTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler({});
    expect(result.scope).toBe("all");
  });

  it("throws when workflow id is missing", async () => {
    const services = createOrchestratorServices("templates");
    const tool = optimizeTokensTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      roleEnforcer: services.roleEnforcer,
    });

    await expect(tool.handler({ workflowId: "missing-id" })).rejects.toThrow("Workflow not found");
  });

  it("flags planner execution and repeated templates within a workflow", async () => {
    const services = createOrchestratorServices("templates");
    const workflow = services.stateManager.createWorkflow("optimize-flags");

    for (let i = 1; i <= 3; i += 1) {
      const id = `planner-task-${i}`;
      services.stateManager.createTask({
        id,
        task: `Task ${i}`,
        executor: "claude",
        template: "typescript-feature",
        context: {},
        inputs: {},
        executionSteps: [],
        expectedOutputs: [],
        successCriteria: [],
        metadata: {
          created: new Date().toISOString(),
        },
      });
      services.stateManager.addTaskToWorkflow(workflow.id, id);
    }

    const tool = optimizeTokensTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler({ workflowId: workflow.id });
    expect(result.recommendations.join(" ")).toContain("executed by planner");
    expect(result.recommendations.join(" ")).toContain("Consider batching these tasks");
  });

  it("returns bounded portfolio recommendation when no planner execution is present", async () => {
    const services = createOrchestratorServices("templates");
    const workflow = services.stateManager.createWorkflow("portfolio-bounds");
    services.stateManager.createTask({
      id: "executor-task",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: {
        created: new Date().toISOString(),
      },
    });
    services.stateManager.addTaskToWorkflow(workflow.id, "executor-task");

    const tool = optimizeTokensTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      roleEnforcer: services.roleEnforcer,
    });
    const result = await tool.handler({});

    expect(result.report).toContain("Workflows analyzed: 1");
    expect(result.recommendations).toContain("Workflow portfolio is within expected optimization bounds.");
  });
});
