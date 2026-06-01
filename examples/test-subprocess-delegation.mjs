import path from "node:path";

import {
  createDefaultToolRegistry,
  createOrchestratorServicesFromConfig,
} from "../dist/tools/registry.js";

async function main() {
  const services = await createOrchestratorServicesFromConfig(
    "templates",
    "orchestrator-config.json"
  );
  await services.templateRegistry.initialize();
  const registry = createDefaultToolRegistry(services);

  const created = await registry.invoke("create_task_spec", {
    task: "Return exactly: OK_FROM_GEMINI",
    executor: "gemini",
    inputs: {
      feature: "Return exactly: OK_FROM_GEMINI",
      files: [],
    },
  });
  const createdPayload = JSON.parse(created.content[0]?.text ?? "{}");

  const delegated = await registry.invoke("delegate_task", {
    taskId: createdPayload.taskId,
    executor: "gemini",
    executionMode: "subprocess",
    timeoutMs: 120000,
  });
  const delegatedPayload = JSON.parse(delegated.content[0]?.text ?? "{}");

  const output = {
    taskId: createdPayload.taskId,
    status: delegatedPayload.status,
    executor: delegatedPayload.executor,
    attemptedExecutors: delegatedPayload.attemptedExecutors,
    execution: delegatedPayload.execution,
    reportSummary: delegatedPayload.reportSummary,
    taskFile: path.join("state", "tasks", `${createdPayload.taskId}.json`),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
