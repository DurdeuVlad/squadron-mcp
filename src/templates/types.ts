import { z } from "zod";

export const TemplateInputTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
  "file",
  "reference",
]);

export const TemplateInputSchema = z
  .object({
    name: z.string().min(1),
    type: TemplateInputTypeSchema,
    required: z.boolean().default(false),
    default: z.unknown().optional(),
    description: z.string().optional(),
  })
  .passthrough();

export const ExecutionStepSchema = z.string().min(1);

export const OutputSpecSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    type: z.string().optional(),
  })
  .passthrough();

export const SuccessCriterionSchema = z.string().min(1);

export const EstimatedTokensSchema = z
  .object({
    planning: z.number().nonnegative().optional(),
    execution: z.number().nonnegative().optional(),
    validation: z.number().nonnegative().optional(),
    reporting: z.number().nonnegative().optional(),
  })
  .partial();

export const TaskTemplateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    inputs: z.array(TemplateInputSchema),
    executionSteps: z.array(ExecutionStepSchema),
    expectedOutputs: z.array(OutputSpecSchema),
    successCriteria: z.array(SuccessCriterionSchema),
    estimatedTokens: EstimatedTokensSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const WorkflowStepSchema = z
  .object({
    step: z.string().min(1),
    description: z.string().optional(),
  })
  .passthrough();

export const WorkflowTemplateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    workflow: z.array(WorkflowStepSchema).min(1),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const TemplateSchema = z.union([TaskTemplateSchema, WorkflowTemplateSchema]);

export type TemplateInput = z.infer<typeof TemplateInputSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type OutputSpec = z.infer<typeof OutputSpecSchema>;
export type SuccessCriterion = z.infer<typeof SuccessCriterionSchema>;
export type EstimatedTokens = z.infer<typeof EstimatedTokensSchema>;
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type Template = z.infer<typeof TemplateSchema>;

export function isTaskTemplate(template: Template): template is TaskTemplate {
  return "executionSteps" in template;
}

export function isWorkflowTemplate(template: Template): template is WorkflowTemplate {
  return "workflow" in template;
}
