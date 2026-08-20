import { afterEach, describe, expect, it } from "vitest";

import { createDashboardServer } from "../../src/dashboard/server.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";

const runningDashboards: Array<{ stop: () => Promise<void> }> = [];

afterEach(async () => {
  while (runningDashboards.length > 0) {
    const dashboard = runningDashboards.pop();
    if (dashboard) {
      await dashboard.stop();
    }
  }
});

describe("createDashboardServer", () => {
  it("serves workflow and metrics endpoints", async () => {
    const services = createOrchestratorServices("templates");
    const workflow = services.stateManager.createWorkflow("dashboard");
    services.stateManager.createTask({
      id: "task-dashboard",
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
    services.stateManager.addTaskToWorkflow(workflow.id, "task-dashboard");
    services.stateManager.trackTaskTokenUsage("task-dashboard", 30);
    services.tokenTracker.trackTokenUsage(workflow.id, "gemini", "execution", 30);

    const dashboard = createDashboardServer(services, { port: 0 });
    runningDashboards.push(dashboard);
    const port = await dashboard.start();
    const base = `http://127.0.0.1:${port}`;

    const workflowsResponse = await fetch(`${base}/api/workflows`);
    const workflowsPayload = (await workflowsResponse.json()) as {
      workflows: Array<{ id: string }>;
      overview: { totalTokens: number; avgTokensPerTask: number };
    };
    expect(workflowsResponse.status).toBe(200);
    expect(workflowsPayload.workflows.some((item) => item.id === workflow.id)).toBe(true);
    expect(workflowsPayload.overview.totalTokens).toBe(30);
    expect(workflowsPayload.overview.avgTokensPerTask).toBe(30);
    expect(workflowsPayload.overview).not.toHaveProperty("totalSavings");

    const workflowResponse = await fetch(`${base}/api/workflows/${workflow.id}`);
    expect(workflowResponse.status).toBe(200);

    const missingResponse = await fetch(`${base}/api/workflows/missing`);
    expect(missingResponse.status).toBe(404);

    const metricsResponse = await fetch(`${base}/api/metrics`);
    const metricsPayload = (await metricsResponse.json()) as { overview: { workflows: number } };
    expect(metricsResponse.status).toBe(200);
    expect(metricsPayload.overview.workflows).toBeGreaterThanOrEqual(1);
  });
});
