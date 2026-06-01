import type { Task, WorkflowState } from "./types.js";

export interface StorageAdapter {
  saveTask(task: Task): void;
  loadTask(id: string): Task | null;
  listTaskIds(): string[];
  saveWorkflow(workflow: WorkflowState): void;
  loadWorkflow(id: string): WorkflowState | null;
  listWorkflowIds(): string[];
  clear(): void;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly tasks = new Map<string, Task>();
  private readonly workflows = new Map<string, WorkflowState>();

  saveTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  loadTask(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  listTaskIds(): string[] {
    return [...this.tasks.keys()];
  }

  saveWorkflow(workflow: WorkflowState): void {
    this.workflows.set(workflow.id, workflow);
  }

  loadWorkflow(id: string): WorkflowState | null {
    return this.workflows.get(id) ?? null;
  }

  listWorkflowIds(): string[] {
    return [...this.workflows.keys()];
  }

  clear(): void {
    this.tasks.clear();
    this.workflows.clear();
  }
}
