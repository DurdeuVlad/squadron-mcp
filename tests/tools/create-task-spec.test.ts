import { describe, expect, it } from "vitest";

import { createTaskSpecTool } from "../../src/tools/create-task-spec.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";

describe("createTaskSpecTool", () => {
  it("builds a task spec with defaults", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const input = tool.schema.parse({
      task: "Implement core server",
      inputs: {
        feature: "Implement core server",
        files: ["src/index.ts"],
      },
    });
    const result = await tool.handler(input);

    expect(result.taskId.length).toBeGreaterThan(10);
    expect(result.executor).toBe("gemini");
    expect(result.template).toBe("typescript-feature");
    expect(result.successCriteria.length).toBeGreaterThan(0);
    expect(result.executionSteps.length).toBeGreaterThan(0);
    expect(services.stateManager.getTask(result.taskId)?.status).toBe("pending");
  });

  it("keeps explicit success criteria", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const input = tool.schema.parse({
      task: "Add tests",
      template: "code-review",
      inputs: {
        filePath: "src/index.ts",
      },
      successCriteria: ["Build passes", "Tests pass"],
    });
    const result = await tool.handler(input);

    expect(result.successCriteria).toEqual(["Build passes", "Tests pass"]);
  });

  it("fails when required template input is missing", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const input = tool.schema.parse({
      task: "Review file",
      template: "code-review",
      inputs: {},
      context: {},
    });

    await expect(tool.handler(input)).rejects.toThrow("Missing required template input: filePath");
  });

  it("merges defaults from template inputs", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const input = tool.schema.parse({
      task: "Implement feature",
      template: "typescript-feature",
      inputs: {
        feature: "Implement feature",
        files: ["src/tools/create-task-spec.ts"],
      },
      context: {},
      successCriteria: [],
      executor: "gemini",
    });
    const result = await tool.handler(input);

    const stored = services.stateManager.getTask(result.taskId);
    expect(stored?.spec.inputs.testRequired).toBe(true);
    expect(stored?.spec.inputs.dependencies).toEqual([]);
  });

  it("fails when planner lacks planning capability", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const input = tool.schema.parse({
      task: "Executor as planner should fail",
      planner: "gemini",
      template: "typescript-feature",
      inputs: {
        feature: "Bad planner",
        files: ["src/index.ts"],
      },
    });

    await expect(tool.handler(input)).rejects.toThrow("does not have planning capability");
  });

  it("reads required input values from context and preserves extra input keys", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler(
      tool.schema.parse({
        task: "Review file with context fallback",
        template: "code-review",
        context: { filePath: "src/index.ts" },
        inputs: { customFlag: true },
      })
    );

    const stored = services.stateManager.getTask(result.taskId);
    expect(stored?.spec.inputs.filePath).toBe("src/index.ts");
    expect(stored?.spec.inputs.customFlag).toBe(true);
  });

  it("attaches task to workflow when workflow id is provided", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const workflow = services.stateManager.createWorkflow("attach");
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler(
      tool.schema.parse({
        task: "Attach task to workflow",
        workflowId: workflow.id,
        inputs: {
          feature: "Attach task",
          files: ["src/tools/create-task-spec.ts"],
        },
      })
    );

    const updatedWorkflow = services.stateManager.getWorkflow(workflow.id);
    expect(result.workflowId).toBe(workflow.id);
    expect(updatedWorkflow?.tasks.some((task) => task.id === result.taskId)).toBe(true);
  });

  it("stores dependsOn on the task spec and rejects unknown dependency ids", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const base = await tool.handler(
      tool.schema.parse({
        task: "Base task",
        inputs: { feature: "Base task", files: ["src/index.ts"] },
      })
    );
    const child = await tool.handler(
      tool.schema.parse({
        task: "Child task",
        inputs: { feature: "Child task", files: ["src/index.ts"] },
        dependsOn: [base.taskId],
      })
    );

    const stored = services.stateManager.getTask(child.taskId);
    expect(stored?.spec.dependsOn).toEqual([base.taskId]);

    await expect(
      tool.handler(
        tool.schema.parse({
          task: "Bad dependency",
          inputs: { feature: "Bad dependency", files: ["src/index.ts"] },
          dependsOn: ["missing-task-id"],
        })
      )
    ).rejects.toThrow("depends on unknown task");
  });

  it("fails when template is not a task template", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    await expect(
      tool.handler(
        tool.schema.parse({
          task: "Use workflow template",
          template: "user-standard-workflow",
        })
      )
    ).rejects.toThrow("is not a task template");
  });

  it("stores an optional model on the task spec for later delegation", async () => {
    const services = createOrchestratorServices("templates");
    await services.templateRegistry.initialize();
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    const result = await tool.handler(
      tool.schema.parse({
        task: "Implement with a specific model",
        model: "haiku",
        inputs: {
          feature: "Implement with a specific model",
          files: ["src/index.ts"],
        },
      })
    );

    const stored = services.stateManager.getTask(result.taskId);
    expect(stored?.spec.model).toBe("haiku");
  });

  it("rejects an empty-string model at the schema boundary", () => {
    const services = createOrchestratorServices("templates");
    const tool = createTaskSpecTool({
      templateRegistry: services.templateRegistry,
      stateManager: services.stateManager,
      roleEnforcer: services.roleEnforcer,
    });

    expect(() => tool.schema.parse({ task: "Bad model", model: "" })).toThrow();
  });
});
