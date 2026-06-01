import { createDefaultToolRegistry, createOrchestratorServices } from "../dist/tools/registry.js";

async function run() {
  const services = createOrchestratorServices("templates");
  await services.templateRegistry.initialize();
  const registry = createDefaultToolRegistry(services);
  const workflow = services.stateManager.createWorkflow("verification");

  const created = await registry.invoke("create_task_spec", {
    task: "Verification task",
    template: "typescript-feature",
    workflowId: workflow.id,
    inputs: {
      feature: "Verification workflow",
      files: ["src/index.ts"],
    },
  });
  const taskId = JSON.parse(created.content[0]?.text ?? "{}").taskId;

  await registry.invoke("delegate_task", {
    taskId,
    executor: "gemini",
    workflowId: workflow.id,
  });

  await registry.invoke("collect_report", {
    taskId,
    workflowId: workflow.id,
    tokenStage: "execution",
    status: "completed",
    summary: "Verification complete",
    outputs: ["ok"],
    metrics: { tokenUsage: 25 },
  });

  await registry.invoke("review_output", {
    taskId,
    criteria: ["quality"],
    decision: "approve",
    reviewer: "claude",
  });

  const optimization = await registry.invoke("optimize_tokens", { workflowId: workflow.id });
  console.log(optimization.content[0]?.text ?? "");

  const tracked = await registry.invoke("track_workflow", { workflowId: workflow.id });
  console.log(tracked.content[0]?.text ?? "");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
