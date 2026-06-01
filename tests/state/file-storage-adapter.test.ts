import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { FileStorageAdapter } from "../../src/state/file-storage-adapter.js";
import { StateManager } from "../../src/state/state-manager.js";

const dirsToClean: string[] = [];

afterEach(() => {
  for (const dir of dirsToClean.splice(0, dirsToClean.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTaskSpec(id: string) {
  return {
    id,
    task: "Persisted task",
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

describe("FileStorageAdapter + StateManager", () => {
  it("persists and reloads tasks/workflows from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrator-state-"));
    dirsToClean.push(dir);

    const manager = new StateManager(new FileStorageAdapter(dir));
    const workflow = manager.createWorkflow("persist-workflow");
    manager.createTask(makeTaskSpec("persist-task"));
    manager.addTaskToWorkflow(workflow.id, "persist-task");
    manager.updateTaskStatus("persist-task", "completed");
    manager.trackWorkflowTokenUsage(workflow.id, "execution", 123);

    const reloadedManager = new StateManager(new FileStorageAdapter(dir));
    expect(reloadedManager.getTask("persist-task")?.status).toBe("completed");
    expect(reloadedManager.getWorkflow(workflow.id)?.tasks.length).toBe(1);
    expect(reloadedManager.getWorkflow(workflow.id)?.tokenUsage.execution).toBe(123);
  });

  it("clears persisted state", () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrator-state-clear-"));
    dirsToClean.push(dir);
    const manager = new StateManager(new FileStorageAdapter(dir));
    manager.createTask(makeTaskSpec("task-clear"));
    manager.createWorkflow("wf-clear");

    manager.clear();

    const reloaded = new StateManager(new FileStorageAdapter(dir));
    expect(reloaded.listTasks()).toEqual([]);
    expect(reloaded.listWorkflows()).toEqual([]);
  });
});
