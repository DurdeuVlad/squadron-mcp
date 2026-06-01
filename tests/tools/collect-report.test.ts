import { describe, expect, it } from "vitest";

import { collectReportTool } from "../../src/tools/collect-report.js";
import { StateManager } from "../../src/state/state-manager.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";

function seedTask(stateManager: StateManager, id: string): void {
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
}

describe("collectReportTool", () => {
  it("returns a collected report with defaults", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-1");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });
    const input = tool.schema.parse({
      taskId: "task-1",
      summary: "Execution completed successfully.",
    });
    const result = await tool.handler(input);

    expect(result.reportId).toMatch(/^report-/);
    expect(result.status).toBe("completed");
    expect(result.nextAction).toBe("Ready for planner review.");
    expect(result.outputs).toEqual([]);
    expect(result.formattedReport).toContain("**Task Completed:**");
    expect(stateManager.getTask("task-1")?.status).toBe("completed");
  });

  it("maps failed status to remediation next action", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-2");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });
    const input = tool.schema.parse({
      taskId: "task-2",
      status: "failed",
      summary: "Tests failed in CI.",
    });
    const result = await tool.handler(input);

    expect(result.nextAction).toBe("Investigate failure and re-delegate task.");
  });

  it("tracks workflow token usage when workflow id is provided", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    const workflow = stateManager.createWorkflow("wf");
    seedTask(stateManager, "task-3");
    stateManager.addTaskToWorkflow(workflow.id, "task-3");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });
    const input = tool.schema.parse({
      taskId: "task-3",
      workflowId: workflow.id,
      tokenStage: "execution",
      summary: "Done.",
      metrics: { tokenUsage: 42 },
    });

    await tool.handler(input);
    const updated = stateManager.getWorkflow(workflow.id);

    expect(updated?.tokenUsage.execution).toBe(42);
    expect(updated?.tokenUsage.total).toBe(42);
    expect(updated?.currentTask).toBeNull();
    expect(updated?.status).toBe("completed");
  });

  it("fails completed report when quality gates fail", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    seedTask(stateManager, "task-4");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });

    const result = await tool.handler({
      taskId: "task-4",
      status: "completed",
      summary: "Done with critical issue.",
      outputs: [],
      issues: ["CRITICAL: regression detected"],
      recommendations: [],
      metrics: {},
      tokenStage: "reporting",
    });

    expect(result.quality.passed).toBe(false);
    expect(result.taskState.status).toBe("failed");
  });

  it("uses in-progress status with fallback token field and keeps workflow active", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    const workflow = stateManager.createWorkflow("wf-in-progress");
    seedTask(stateManager, "task-5");
    stateManager.addTaskToWorkflow(workflow.id, "task-5");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });

    const result = await tool.handler({
      taskId: "task-5",
      status: "in_progress",
      summary: "Still running.",
      outputs: [],
      issues: [],
      recommendations: [],
      metrics: { tokensUsed: 12 },
      workflowId: workflow.id,
      tokenStage: "execution",
    });

    const updatedWorkflow = stateManager.getWorkflow(workflow.id);
    expect(result.nextAction).toBe("Continue execution and collect updated report.");
    expect(result.taskState.status).toBe("executing");
    expect(updatedWorkflow?.currentTask).toBe("task-5");
    expect(updatedWorkflow?.tokenUsage.execution).toBe(12);
  });

  it("marks workflow failed when a task fails and nothing is still running", async () => {
    const services = createOrchestratorServices("templates");
    const stateManager = services.stateManager;
    const workflow = stateManager.createWorkflow("wf-fail");
    seedTask(stateManager, "task-6");
    stateManager.addTaskToWorkflow(workflow.id, "task-6");
    const tool = collectReportTool({
      stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });

    const result = await tool.handler({
      taskId: "task-6",
      status: "failed",
      summary: "Execution failed.",
      outputs: [],
      issues: ["blocked"],
      recommendations: [],
      metrics: {},
      workflowId: workflow.id,
      tokenStage: "reporting",
    });

    expect(result.taskState.status).toBe("failed");
    expect(stateManager.getWorkflow(workflow.id)?.status).toBe("failed");
    expect(stateManager.getWorkflow(workflow.id)?.currentTask).toBeNull();
  });

  it("throws when task does not exist", async () => {
    const services = createOrchestratorServices("templates");
    const tool = collectReportTool({
      stateManager: services.stateManager,
      tokenTracker: services.tokenTracker,
      qualityGates: services.qualityGates,
    });

    await expect(
      tool.handler({
        taskId: "missing-task",
        status: "completed",
        summary: "No task",
        outputs: [],
        issues: [],
        recommendations: [],
        metrics: {},
        tokenStage: "reporting",
      })
    ).rejects.toThrow("Task not found");
  });
});
