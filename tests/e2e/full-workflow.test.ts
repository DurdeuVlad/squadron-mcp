import { describe, expect, it } from "vitest";

import { createDefaultToolRegistry, createOrchestratorServices } from "../../src/tools/registry.js";

function parseStructuredResult(result: {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: string; text: string }>;
}) {
  if (result.isError) {
    throw new Error(result.content[0]?.text ?? "Tool invocation failed");
  }

  return result.structuredContent ?? {};
}

describe("E2E full workflow", () => {
  it("completes create -> delegate -> collect -> review -> track -> optimize", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const registry = createDefaultToolRegistry(services);
    const workflow = services.stateManager.createWorkflow("e2e");

    const created = parseStructuredResult(
      await registry.invoke("create_task_spec", {
        task: "End-to-end test task",
        template: "typescript-feature",
        executor: "gemini",
        workflowId: workflow.id,
        inputs: {
          feature: "End-to-end test task",
          files: ["src/index.ts"],
        },
      })
    ) as { taskId: string };

    await registry.invoke("delegate_task", {
      taskId: created.taskId,
      executor: "gemini",
      workflowId: workflow.id,
    });

    await registry.invoke("collect_report", {
      taskId: created.taskId,
      workflowId: workflow.id,
      status: "completed",
      summary: "Done",
      outputs: ["dist/out.txt"],
      issues: [],
      recommendations: ["Ship it"],
      metrics: {
        tokenUsage: 55,
        testsPassed: 10,
        testsTotal: 10,
        buildSuccess: true,
      },
      tokenStage: "execution",
    });

    await registry.invoke("review_output", {
      taskId: created.taskId,
      criteria: ["quality"],
      decision: "approve",
      reviewer: "claude",
    });

    const tracked = parseStructuredResult(
      await registry.invoke("track_workflow", { workflowId: workflow.id })
    ) as { status: string; tokenUsage: { total: number } };
    expect(tracked.status).toBe("completed");
    expect(tracked.tokenUsage.total).toBe(55);

    const optimized = parseStructuredResult(
      await registry.invoke("optimize_tokens", { workflowId: workflow.id })
    ) as { scope: string; report: string };
    expect(optimized.scope).toBe("workflow");
    expect(optimized.report).toContain("Token Usage Report");
  });
});
