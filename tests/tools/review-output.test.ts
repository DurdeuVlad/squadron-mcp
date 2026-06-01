import { describe, expect, it } from "vitest";

import { StateManager } from "../../src/state/state-manager.js";
import { reviewOutputTool } from "../../src/tools/review-output.js";

function seedCompletedTask(stateManager: StateManager, id: string): void {
  stateManager.createTask({
    id,
    task: "Seed task",
    executor: "gemini",
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
  stateManager.attachTaskReport(id, { summary: "done" });
  stateManager.updateTaskStatus(id, "completed");
}

describe("reviewOutputTool", () => {
  it("records approval and keeps task completed", async () => {
    const stateManager = new StateManager();
    seedCompletedTask(stateManager, "task-1");
    const tool = reviewOutputTool({ stateManager });

    const result = await tool.handler({
      taskId: "task-1",
      criteria: ["quality", "completeness"],
      decision: "approve",
      reviewer: "claude",
    });

    expect(result.taskStatus).toBe("completed");
    expect(stateManager.getTask("task-1")?.review?.decision).toBe("approve");
  });

  it("sets task to pending on revise", async () => {
    const stateManager = new StateManager();
    seedCompletedTask(stateManager, "task-2");
    const tool = reviewOutputTool({ stateManager });

    const result = await tool.handler({
      taskId: "task-2",
      criteria: ["fairness"],
      decision: "revise",
      reviewer: "claude",
      feedback: "Improve balance",
    });

    expect(result.taskStatus).toBe("pending");
  });

  it("fails if no report is present", async () => {
    const stateManager = new StateManager();
    stateManager.createTask({
      id: "task-3",
      task: "No report task",
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
    const tool = reviewOutputTool({ stateManager });

    await expect(
      tool.handler({
        taskId: "task-3",
        criteria: [],
        decision: "approve",
        reviewer: "claude",
      })
    ).rejects.toThrow("No report found");
  });

  it("marks task as failed on reject decision", async () => {
    const stateManager = new StateManager();
    seedCompletedTask(stateManager, "task-4");
    const tool = reviewOutputTool({ stateManager });

    const result = await tool.handler({
      taskId: "task-4",
      criteria: ["correctness"],
      decision: "reject",
      reviewer: "claude",
      feedback: "Major regressions found",
    });

    expect(result.taskStatus).toBe("failed");
    expect(result.message).toContain("Review rejected.");
  });

  it("throws when task is missing", async () => {
    const stateManager = new StateManager();
    const tool = reviewOutputTool({ stateManager });

    await expect(
      tool.handler({
        taskId: "missing-task",
        criteria: [],
        decision: "approve",
        reviewer: "claude",
      })
    ).rejects.toThrow("Task not found");
  });
});
