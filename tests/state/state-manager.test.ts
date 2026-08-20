import { describe, expect, it } from "vitest";

import { StateManager } from "../../src/state/state-manager.js";

function makeTaskSpec(id: string) {
  return {
    id,
    task: "Implement feature",
    executor: "gemini",
    template: "typescript-feature",
    context: {},
    inputs: {},
    executionSteps: ["read", "implement", "test"],
    expectedOutputs: [{ name: "artifact", description: "result" }],
    successCriteria: ["tests pass"],
    metadata: {
      created: new Date().toISOString(),
    },
  };
}

describe("StateManager", () => {
  it("creates and retrieves tasks", () => {
    const manager = new StateManager();
    const task = manager.createTask(makeTaskSpec("task-1"));

    expect(task.status).toBe("pending");
    expect(manager.getTask("task-1")?.id).toBe("task-1");
  });

  it("updates task status timestamps", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("task-2"));
    const executing = manager.updateTaskStatus("task-2", "executing");
    const completed = manager.updateTaskStatus("task-2", "completed");

    expect(executing.startTime).toBeDefined();
    expect(completed.endTime).toBeDefined();
  });

  it("creates workflow and tracks token usage", () => {
    const manager = new StateManager();
    const workflow = manager.createWorkflow("sprint");

    manager.trackWorkflowTokenUsage(workflow.id, "planning", 100);
    manager.trackWorkflowTokenUsage(workflow.id, "execution", 300);
    const updated = manager.getWorkflow(workflow.id);

    expect(updated?.tokenUsage.planning).toBe(100);
    expect(updated?.tokenUsage.execution).toBe(300);
    expect(updated?.tokenUsage.total).toBe(400);
  });

  it("links tasks to workflows", () => {
    const manager = new StateManager();
    const workflow = manager.createWorkflow("sprint-2");
    manager.createTask(makeTaskSpec("task-3"));

    manager.addTaskToWorkflow(workflow.id, "task-3");
    const updated = manager.getWorkflow(workflow.id);

    expect(updated?.tasks.length).toBe(1);
    expect(updated?.currentTask).toBe("task-3");
  });

  it("handles workflow lifecycle and guards invalid operations", () => {
    const manager = new StateManager();
    const workflow = manager.createWorkflow("lifecycle");
    manager.createTask(makeTaskSpec("task-4"));
    manager.createTask(makeTaskSpec("task-5"));

    manager.addTaskToWorkflow(workflow.id, "task-4");
    manager.addTaskToWorkflow(workflow.id, "task-4");
    manager.addTaskToWorkflow(workflow.id, "task-5");
    manager.setWorkflowCurrentTask(workflow.id, "task-5");
    manager.setWorkflowCurrentTask(workflow.id, null);

    manager.failWorkflow(workflow.id);
    expect(manager.getWorkflow(workflow.id)?.status).toBe("failed");
    const completed = manager.completeWorkflow(workflow.id);

    expect(completed.status).toBe("completed");
    expect(manager.getWorkflow(workflow.id)?.tasks.length).toBe(2);
    expect(manager.getWorkflow(workflow.id)?.currentTask).toBeNull();
    expect(manager.getWorkflow(workflow.id)?.endTime).toBeDefined();
  });

  it("throws for missing task/workflow entities", () => {
    const manager = new StateManager();
    const workflow = manager.createWorkflow("errors");
    manager.createTask(makeTaskSpec("task-6"));
    manager.addTaskToWorkflow(workflow.id, "task-6");

    expect(() => manager.updateTaskStatus("missing-task", "executing")).toThrow("Task not found");
    expect(() => manager.attachTaskReport("missing-task", {})).toThrow("Task not found");
    expect(() =>
      manager.attachTaskReview("missing-task", {
        reviewer: "claude",
        criteria: [],
        decision: "approve",
        timestamp: new Date().toISOString(),
      })
    ).toThrow("Task not found");
    expect(() => manager.trackTaskTokenUsage("missing-task", 1)).toThrow("Task not found");
    expect(() => manager.addTaskToWorkflow("missing-workflow", "task-6")).toThrow("Workflow not found");
    expect(() => manager.addTaskToWorkflow(workflow.id, "missing-task")).toThrow("Task not found");
    expect(() => manager.setWorkflowCurrentTask("missing-workflow", "task-6")).toThrow(
      "Workflow not found"
    );
    expect(() => manager.setWorkflowCurrentTask(workflow.id, "missing-task")).toThrow(
      "is not part of workflow"
    );
    expect(() => manager.completeWorkflow("missing-workflow")).toThrow("Workflow not found");
    expect(() => manager.failWorkflow("missing-workflow")).toThrow("Workflow not found");
    expect(() => manager.trackWorkflowTokenUsage("missing-workflow", "planning", 10)).toThrow(
      "Workflow not found"
    );
  });

  it("does not overwrite existing timestamps and can clear state", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("task-7"));
    manager.updateTaskStatus("task-7", "executing");
    const startTime = manager.getTask("task-7")?.startTime;
    manager.updateTaskStatus("task-7", "executing");
    manager.updateTaskStatus("task-7", "completed");
    const endTime = manager.getTask("task-7")?.endTime;
    manager.updateTaskStatus("task-7", "completed");

    expect(manager.getTask("task-7")?.startTime).toBe(startTime);
    expect(manager.getTask("task-7")?.endTime).toBe(endTime);

    manager.clear();
    expect(manager.listTasks()).toEqual([]);
    expect(manager.listWorkflows()).toEqual([]);
  });

  it("accepts a task with satisfied dependency references", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("dep-base"));
    const task = manager.createTask({ ...makeTaskSpec("dep-child"), dependsOn: ["dep-base"] });

    expect(task.spec.dependsOn).toEqual(["dep-base"]);
    expect(manager.getUnmetDependencies("dep-child")).toEqual(["dep-base"]);

    manager.updateTaskStatus("dep-base", "completed");
    expect(manager.getUnmetDependencies("dep-child")).toEqual([]);
  });

  it("returns no unmet dependencies for a task without dependsOn", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("dep-none"));
    expect(manager.getUnmetDependencies("dep-none")).toEqual([]);
  });

  it("rejects a task that depends on itself", () => {
    const manager = new StateManager();
    expect(() =>
      manager.createTask({ ...makeTaskSpec("dep-self"), dependsOn: ["dep-self"] })
    ).toThrow("cannot depend on itself");
  });

  it("rejects a task that depends on an unknown task", () => {
    const manager = new StateManager();
    expect(() =>
      manager.createTask({ ...makeTaskSpec("dep-unknown"), dependsOn: ["missing-task"] })
    ).toThrow("depends on unknown task");
  });

  it("rejects a direct back-reference dependency cycle", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("dep-x"));
    manager.createTask({ ...makeTaskSpec("dep-y"), dependsOn: ["dep-x"] });

    expect(() =>
      manager.createTask({ ...makeTaskSpec("dep-x"), dependsOn: ["dep-y"] })
    ).toThrow("Circular dependency");
  });

  it("throws for getUnmetDependencies on a missing task", () => {
    const manager = new StateManager();
    expect(() => manager.getUnmetDependencies("missing-task")).toThrow("Task not found");
  });

  it("stores execution metadata and history", () => {
    const manager = new StateManager();
    manager.createTask(makeTaskSpec("task-exec"));

    manager.attachTaskExecution("task-exec", {
      status: "failed",
      agent: "gemini",
      attempt: 1,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 100,
      exitCode: 1,
      signal: null,
      stdout: "",
      stderr: "failure",
    });

    manager.attachTaskExecution("task-exec", {
      status: "completed",
      agent: "codex",
      attempt: 2,
      fallbackFrom: "gemini",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 120,
      exitCode: 0,
      signal: null,
      stdout: "{\"summary\":\"done\"}",
      stderr: "",
    });

    const task = manager.getTask("task-exec");
    expect(task?.execution?.agent).toBe("codex");
    expect(task?.executionHistory.length).toBe(2);
  });
});
