import { describe, expect, it } from "vitest";

import { createDefaultToolRegistry, createOrchestratorServices } from "../../src/tools/registry.js";

function parseToolResult<T>(text: string | undefined): T {
  return JSON.parse(text ?? "{}") as T;
}

describe("orchestration workflow", () => {
  it("supports create -> delegate -> collect -> review -> track", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const registry = createDefaultToolRegistry(services);
    const workflow = services.stateManager.createWorkflow("e2e");

    const createResult = await registry.invoke("create_task_spec", {
      task: "Add track workflow tool",
      template: "typescript-feature",
      workflowId: workflow.id,
      inputs: {
        feature: "Track workflow status summary",
        files: ["src/tools/track-workflow.ts"],
      },
    });
    expect(createResult.isError).toBeUndefined();
    const created = parseToolResult<{ taskId: string }>(createResult.content[0]?.text);

    const delegateResult = await registry.invoke("delegate_task", {
      taskId: created.taskId,
      executor: "gemini",
      workflowId: workflow.id,
    });
    expect(delegateResult.isError).toBeUndefined();

    const collectResult = await registry.invoke("collect_report", {
      taskId: created.taskId,
      workflowId: workflow.id,
      tokenStage: "execution",
      status: "completed",
      summary: "Implemented and tested.",
      outputs: ["src/tools/track-workflow.ts"],
      metrics: {
        tokenUsage: 120,
        durationSeconds: 30,
      },
    });
    expect(collectResult.isError).toBeUndefined();

    const reviewResult = await registry.invoke("review_output", {
      taskId: created.taskId,
      criteria: ["quality", "completeness"],
      decision: "approve",
      reviewer: "claude",
      feedback: "Looks good.",
    });
    expect(reviewResult.isError).toBeUndefined();

    const trackResult = await registry.invoke("track_workflow", {
      workflowId: workflow.id,
    });
    expect(trackResult.isError).toBeUndefined();
    const tracked = parseToolResult<{
      progress: { completed: number; total: number };
      tokenUsage: { total: number };
    }>(trackResult.content[0]?.text);

    expect(tracked.progress.completed).toBe(1);
    expect(tracked.progress.total).toBe(1);
    expect(tracked.tokenUsage.total).toBe(120);
  });
});
