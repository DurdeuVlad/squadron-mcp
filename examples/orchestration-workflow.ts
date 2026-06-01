import { createDefaultToolRegistry, createOrchestratorServices } from "../src/tools/registry.js";

async function main(): Promise<void> {
  const services = createOrchestratorServices("templates");
  await services.templateRegistry.initialize();
  const registry = createDefaultToolRegistry(services);
  const workflow = services.stateManager.createWorkflow("example-workflow");

  const created = await registry.invoke("create_task_spec", {
    task: "Implement review output improvements",
    template: "typescript-feature",
    workflowId: workflow.id,
    inputs: {
      feature: "Enhance review output formatting",
      files: ["src/tools/review-output.ts"],
    },
  });

  const createdPayload = JSON.parse(created.content[0]?.text ?? "{}") as { taskId: string };

  await registry.invoke("delegate_task", {
    taskId: createdPayload.taskId,
    executor: "gemini",
    workflowId: workflow.id,
  });

  await registry.invoke("collect_report", {
    taskId: createdPayload.taskId,
    workflowId: workflow.id,
    tokenStage: "execution",
    status: "completed",
    summary: "Feature implemented and validated.",
    outputs: ["src/tools/review-output.ts"],
    metrics: {
      tokenUsage: 100,
      durationSeconds: 12,
    },
  });

  await registry.invoke("review_output", {
    taskId: createdPayload.taskId,
    criteria: ["quality", "completeness"],
    decision: "approve",
    reviewer: "claude",
  });

  const tracked = await registry.invoke("track_workflow", {
    workflowId: workflow.id,
  });

  console.log(tracked.content[0]?.text ?? "");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
