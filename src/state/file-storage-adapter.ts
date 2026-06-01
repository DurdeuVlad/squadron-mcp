import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { TaskSchema, WorkflowStateSchema, type Task, type WorkflowState } from "./types.js";
import type { StorageAdapter } from "./storage-adapter.js";

export class FileStorageAdapter implements StorageAdapter {
  private readonly tasksDir: string;
  private readonly workflowsDir: string;

  constructor(private readonly stateDir = "state") {
    this.tasksDir = join(this.stateDir, "tasks");
    this.workflowsDir = join(this.stateDir, "workflows");
    mkdirSync(this.tasksDir, { recursive: true });
    mkdirSync(this.workflowsDir, { recursive: true });
  }

  saveTask(task: Task): void {
    const parsed = TaskSchema.parse(task);
    writeFileSync(join(this.tasksDir, `${parsed.id}.json`), JSON.stringify(parsed, null, 2), "utf8");
  }

  loadTask(id: string): Task | null {
    const path = join(this.tasksDir, `${id}.json`);
    if (!existsSync(path)) {
      return null;
    }

    try {
      return TaskSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
    } catch {
      return null;
    }
  }

  listTaskIds(): string[] {
    if (!existsSync(this.tasksDir)) {
      return [];
    }

    return readdirSync(this.tasksDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/u, ""));
  }

  saveWorkflow(workflow: WorkflowState): void {
    const parsed = WorkflowStateSchema.parse(workflow);
    writeFileSync(
      join(this.workflowsDir, `${parsed.id}.json`),
      JSON.stringify(parsed, null, 2),
      "utf8"
    );
  }

  loadWorkflow(id: string): WorkflowState | null {
    const path = join(this.workflowsDir, `${id}.json`);
    if (!existsSync(path)) {
      return null;
    }

    try {
      return WorkflowStateSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
    } catch {
      return null;
    }
  }

  listWorkflowIds(): string[] {
    if (!existsSync(this.workflowsDir)) {
      return [];
    }

    return readdirSync(this.workflowsDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/u, ""));
  }

  clear(): void {
    rmSync(this.tasksDir, { recursive: true, force: true });
    rmSync(this.workflowsDir, { recursive: true, force: true });
    mkdirSync(this.tasksDir, { recursive: true });
    mkdirSync(this.workflowsDir, { recursive: true });
  }
}
