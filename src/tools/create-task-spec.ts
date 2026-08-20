import { z } from "zod";
import { randomUUID } from "node:crypto";

import { type TemplateRegistry } from "../templates/loader.js";
import { isTaskTemplate } from "../templates/types.js";
import { type StateManager } from "../state/state-manager.js";
import { type RoleEnforcer } from "../enforcement/role-enforcer.js";
import type { TaskSpec as StoredTaskSpec } from "../state/types.js";
import type { ToolDefinition } from "./types.js";

const createTaskSpecSchema = z.object({
  task: z.string().min(1, "task is required"),
  executor: z.enum(["claude", "gemini", "codex"]).default("gemini"),
  template: z.string().default("typescript-feature"),
  context: z.record(z.unknown()).default({}),
  inputs: z.record(z.unknown()).default({}),
  successCriteria: z.array(z.string()).default([]),
  workflowId: z.string().optional(),
  planner: z.string().default("claude"),
  dependsOn: z.array(z.string()).optional(),
});

export type CreateTaskSpecInput = z.infer<typeof createTaskSpecSchema>;

export interface CreateTaskSpecResult {
  taskId: string;
  task: string;
  executor: "claude" | "gemini" | "codex";
  template: string;
  executionSteps: string[];
  expectedOutputs: Array<{
    name: string;
    description: string;
    type?: string;
  }>;
  successCriteria: string[];
  workflowId?: string;
  state: {
    status: "pending";
    createdAt: string;
  };
}

export interface CreateTaskSpecDependencies {
  templateRegistry: TemplateRegistry;
  stateManager: StateManager;
  roleEnforcer: RoleEnforcer;
}

function createTaskId(): string {
  return randomUUID();
}

function sumEstimatedTokens(template: {
  estimatedTokens?: {
    planning?: number;
    execution?: number;
    validation?: number;
    reporting?: number;
  };
}): number | undefined {
  const estimated = template.estimatedTokens;
  if (!estimated) {
    return undefined;
  }

  const total =
    (estimated.planning ?? 0) +
    (estimated.execution ?? 0) +
    (estimated.validation ?? 0) +
    (estimated.reporting ?? 0);
  return total > 0 ? total : undefined;
}

function resolveTemplateInputs(input: CreateTaskSpecInput, template: { inputs: Array<{
  name: string;
  required?: boolean;
  default?: unknown;
}> }): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const inputDef of template.inputs) {
    if (input.inputs[inputDef.name] !== undefined) {
      merged[inputDef.name] = input.inputs[inputDef.name];
      continue;
    }

    if (input.context[inputDef.name] !== undefined) {
      merged[inputDef.name] = input.context[inputDef.name];
      continue;
    }

    if (inputDef.default !== undefined) {
      merged[inputDef.name] = inputDef.default;
      continue;
    }

    if (inputDef.required) {
      throw new Error(`Missing required template input: ${inputDef.name}`);
    }
  }

  // Preserve explicitly provided keys that are not defined in template schema.
  for (const [key, value] of Object.entries(input.inputs)) {
    if (!(key in merged)) {
      merged[key] = value;
    }
  }

  return merged;
}

function toStoredSpec(input: {
  id: string;
  payload: CreateTaskSpecInput;
  executionSteps: string[];
  expectedOutputs: Array<{ name: string; description: string; type?: string }>;
  successCriteria: string[];
  estimatedTokens?: number;
}): StoredTaskSpec {
  return {
    id: input.id,
    task: input.payload.task,
    executor: input.payload.executor,
    template: input.payload.template,
    dependsOn: input.payload.dependsOn,
    context: input.payload.context,
    inputs: input.payload.inputs,
    executionSteps: input.executionSteps,
    expectedOutputs: input.expectedOutputs,
    successCriteria: input.successCriteria,
    metadata: {
      created: new Date().toISOString(),
      estimatedTokens: input.estimatedTokens,
    },
  };
}

export function createTaskSpecTool(
  deps: CreateTaskSpecDependencies
): ToolDefinition<CreateTaskSpecInput, CreateTaskSpecResult> {
  return {
    name: "create_task_spec",
    description: "Generate a structured task specification using a registered template.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "High-level task objective.",
        },
        executor: {
          type: "string",
          enum: ["claude", "gemini", "codex"],
          description: "Preferred agent to execute the task.",
        },
        template: {
          type: "string",
          description: "Template name used to build execution steps and criteria.",
        },
        context: {
          type: "object",
          description: "Additional context and constraints.",
        },
        inputs: {
          type: "object",
          description: "Resolved template input values for execution.",
        },
        successCriteria: {
          type: "array",
          items: { type: "string" },
          description: "Optional override for template success criteria.",
        },
        workflowId: {
          type: "string",
          description: "Optional workflow id to immediately attach the task to.",
        },
        planner: {
          type: "string",
          description: "Planner agent responsible for generating this task spec.",
        },
        dependsOn: {
          type: "array",
          items: { type: "string" },
          description:
            "Task IDs (from prior create_task_spec calls) that must be completed before this task can be delegated.",
        },
      },
      required: ["task"],
    },
    schema: createTaskSpecSchema,
    handler: async (input: CreateTaskSpecInput): Promise<CreateTaskSpecResult> => {
      if (!deps.roleEnforcer.checkCapability(input.planner, "planning")) {
        throw new Error(`Agent ${input.planner} does not have planning capability`);
      }

      const template = await deps.templateRegistry.get(input.template);
      if (!isTaskTemplate(template)) {
        throw new Error(`Template ${input.template} is not a task template.`);
      }

      const taskId = createTaskId();
      const successCriteria =
        input.successCriteria.length > 0 ? input.successCriteria : template.successCriteria;
      const estimatedTokens = sumEstimatedTokens(template);
      const resolvedInputs = resolveTemplateInputs(input, template);

      const spec = toStoredSpec({
        id: taskId,
        payload: {
          ...input,
          inputs: resolvedInputs,
        },
        executionSteps: template.executionSteps,
        expectedOutputs: template.expectedOutputs,
        successCriteria,
        estimatedTokens,
      });

      const created = deps.stateManager.createTask(spec);
      if (input.workflowId) {
        deps.stateManager.addTaskToWorkflow(input.workflowId, taskId);
      }

      return {
        taskId,
        task: input.task,
        executor: input.executor,
        template: input.template,
        executionSteps: template.executionSteps,
        expectedOutputs: template.expectedOutputs,
        successCriteria,
        workflowId: input.workflowId,
        state: {
          status: "pending",
          createdAt: created.spec.metadata.created,
        },
      };
    },
  };
}
