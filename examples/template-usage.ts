import { createOrchestratorServices } from "../src/tools/registry.js";

async function runExample(): Promise<void> {
  const services = createOrchestratorServices("templates");
  await services.templateRegistry.initialize();

  const template = await services.templateRegistry.get("code-review");
  console.log("Loaded template:", template.name);

  const workflow = services.stateManager.createWorkflow("template-usage-demo");
  console.log("Created workflow:", workflow.id);
}

runExample().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Example failed:", message);
  process.exit(1);
});
