import { randomUUID } from "node:crypto";

import {
  TaskSchema,
  TaskSpecSchema,
  WorkflowStateSchema,
  TokenStageSchema,
  TaskReviewSchema,
  type Task,
  type TaskSpec,
  type TaskStatus,
  type TaskReview,
  type TaskExecution,
  type WorkflowState,
  type TokenStage,
} from "./types.js";
import { InMemoryStorageAdapter, type StorageAdapter } from "./storage-adapter.js";

export class StateManager {
  private readonly tasks = new Map<string, Task>();
  private readonly workflows = new Map<string, WorkflowState>();

  constructor(private readonly storage: StorageAdapter = new InMemoryStorageAdapter()) {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    for (const taskId of this.storage.listTaskIds()) {
      const task = this.storage.loadTask(taskId);
      if (task) {
        this.tasks.set(task.id, TaskSchema.parse(task));
      }
    }

    for (const workflowId of this.storage.listWorkflowIds()) {
      const workflow = this.storage.loadWorkflow(workflowId);
      if (workflow) {
        this.workflows.set(workflow.id, WorkflowStateSchema.parse(workflow));
      }
    }
  }

  private persistTask(task: Task): void {
    this.storage.saveTask(task);
  }

  private persistWorkflow(workflow: WorkflowState): void {
    this.storage.saveWorkflow(workflow);
  }

  private syncTaskInWorkflows(task: Task): void {
    for (const [workflowId, workflow] of this.workflows.entries()) {
      const taskIndex = workflow.tasks.findIndex((workflowTask) => workflowTask.id === task.id);
      if (taskIndex === -1) {
        continue;
      }

      workflow.tasks[taskIndex] = task;
      this.workflows.set(workflowId, workflow);
      this.persistWorkflow(workflow);
    }
  }

  createTask(specInput: TaskSpec): Task {
    const spec = TaskSpecSchema.parse(specInput);
    const task = TaskSchema.parse({
      id: spec.id,
      spec,
      executor: spec.executor,
      status: "pending",
    });

    this.tasks.set(task.id, task);
    this.persistTask(task);
    return task;
  }

  getTask(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  listTasks(): Task[] {
    return [...this.tasks.values()];
  }

  updateTaskStatus(id: string, status: TaskStatus): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.status = status;
    const now = new Date().toISOString();
    if (status === "executing" && !task.startTime) {
      task.startTime = now;
    }

    if ((status === "completed" || status === "failed" || status === "cancelled") && !task.endTime) {
      task.endTime = now;
    }

    this.tasks.set(id, task);
    this.persistTask(task);
    this.syncTaskInWorkflows(task);
    return task;
  }

  attachTaskReport(id: string, report: Record<string, unknown>): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.report = report;
    this.tasks.set(id, task);
    this.persistTask(task);
    this.syncTaskInWorkflows(task);
    return task;
  }

  attachTaskReview(id: string, reviewInput: TaskReview): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    const review = TaskReviewSchema.parse(reviewInput);
    task.review = review;
    this.tasks.set(id, task);
    this.persistTask(task);
    this.syncTaskInWorkflows(task);
    return task;
  }

  attachTaskExecution(id: string, executionInput: TaskExecution): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    task.execution = executionInput;
    task.executionHistory = [...(task.executionHistory ?? []), executionInput];
    this.tasks.set(id, task);
    this.persistTask(task);
    this.syncTaskInWorkflows(task);
    return task;
  }

  trackTaskTokenUsage(id: string, tokens: number): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    const current = task.tokenUsage?.total ?? 0;
    task.tokenUsage = { total: current + tokens };
    this.tasks.set(id, task);
    this.persistTask(task);
    this.syncTaskInWorkflows(task);
    return task;
  }

  createWorkflow(name?: string): WorkflowState {
    const workflow = WorkflowStateSchema.parse({
      id: randomUUID(),
      name,
      tasks: [],
      currentTask: null,
      status: "pending",
      tokenUsage: {
        planning: 0,
        execution: 0,
        validation: 0,
        reporting: 0,
        total: 0,
      },
      startTime: new Date().toISOString(),
    });

    this.workflows.set(workflow.id, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  getWorkflow(id: string): WorkflowState | null {
    return this.workflows.get(id) ?? null;
  }

  listWorkflows(): WorkflowState[] {
    return [...this.workflows.values()];
  }

  addTaskToWorkflow(workflowId: string, taskId: string): WorkflowState {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!workflow.tasks.some((existing) => existing.id === taskId)) {
      workflow.tasks.push(task);
    }

    if (!workflow.currentTask) {
      workflow.currentTask = taskId;
    }

    if (workflow.status === "pending") {
      workflow.status = "in-progress";
    }

    this.workflows.set(workflowId, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  setWorkflowCurrentTask(workflowId: string, taskId: string | null): WorkflowState {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (taskId && !workflow.tasks.some((task) => task.id === taskId)) {
      throw new Error(`Task ${taskId} is not part of workflow ${workflowId}`);
    }

    workflow.currentTask = taskId;
    this.workflows.set(workflowId, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  completeWorkflow(workflowId: string): WorkflowState {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = "completed";
    workflow.currentTask = null;
    workflow.endTime = new Date().toISOString();
    this.workflows.set(workflowId, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  failWorkflow(workflowId: string): WorkflowState {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = "failed";
    workflow.endTime = new Date().toISOString();
    this.workflows.set(workflowId, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  trackWorkflowTokenUsage(workflowId: string, stageInput: TokenStage, tokens: number): WorkflowState {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const stage = TokenStageSchema.parse(stageInput);
    workflow.tokenUsage[stage] += tokens;
    workflow.tokenUsage.total += tokens;

    this.workflows.set(workflowId, workflow);
    this.persistWorkflow(workflow);
    return workflow;
  }

  clear(): void {
    this.tasks.clear();
    this.workflows.clear();
    this.storage.clear();
  }
}
