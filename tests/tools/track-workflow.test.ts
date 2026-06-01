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
});
