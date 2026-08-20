import { describe, expect, it } from "vitest";

import { StateManager } from "../../src/state/state-manager.js";
import { trackWorkflowTool } from "../../src/tools/track-workflow.js";

describe("trackWorkflowTool", () => {
  it("returns workflow progress and token usage", async () => {
    const stateManager = new StateManager();
    const workflow = stateManager.createWorkflow("workflow");

    stateManager.createTask({
      id: "task-a",
      task: "A",
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
    stateManager.addTaskToWorkflow(workflow.id, "task-a");
    stateManager.updateTaskStatus("task-a", "completed");
    stateManager.trackWorkflowTokenUsage(workflow.id, "execution", 50);

    const tool = trackWorkflowTool({ stateManager });
    const result = await tool.handler({ workflowId: workflow.id });

    expect(result.progress.total).toBe(1);
    expect(result.progress.completed).toBe(1);
    expect(result.tokenUsage.execution).toBe(50);
    expect(result.summary).toContain("Completed: 1/1");
  });

  it("throws when workflow is missing", async () => {
    const stateManager = new StateManager();
    const tool = trackWorkflowTool({ stateManager });

    await expect(tool.handler({ workflowId: "missing" })).rejects.toThrow("Workflow not found");
  });

  it("classifies task readiness based on unmet dependencies", async () => {
    const stateManager = new StateManager();
    const workflow = stateManager.createWorkflow("deps-workflow");

    stateManager.createTask({
      id: "task-base",
      task: "Base",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: { created: new Date().toISOString() },
    });
    stateManager.createTask({
      id: "task-blocked",
      task: "Blocked",
      executor: "gemini",
      template: "typescript-feature",
      dependsOn: ["task-base"],
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: { created: new Date().toISOString() },
    });
    stateManager.addTaskToWorkflow(workflow.id, "task-base");
    stateManager.addTaskToWorkflow(workflow.id, "task-blocked");

    const tool = trackWorkflowTool({ stateManager });
    const beforeCompletion = await tool.handler({ workflowId: workflow.id });

    const base = beforeCompletion.tasks.find((task) => task.id === "task-base");
    const blocked = beforeCompletion.tasks.find((task) => task.id === "task-blocked");
    expect(base?.readiness).toBe("ready");
    expect(blocked?.readiness).toBe("blocked");
    expect(blocked?.blockedBy).toEqual(["task-base"]);
    expect(beforeCompletion.summary).toContain("blocked, waiting on: task-base");

    stateManager.updateTaskStatus("task-base", "completed");
    const afterCompletion = await tool.handler({ workflowId: workflow.id });
    const readyNow = afterCompletion.tasks.find((task) => task.id === "task-blocked");
    expect(readyNow?.readiness).toBe("ready");
    expect(readyNow?.blockedBy).toBeUndefined();
  });
});
