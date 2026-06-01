import { z } from "zod";

export const TaskStatusSchema = z.enum(["pending", "executing", "completed", "failed", "cancelled"]);

export const TaskMetadataSchema = z
  .object({
    created: z.string().datetime(),
    estimatedTokens: z.number().nonnegative().optional(),
  })
  .passthrough();

export const TaskSpecSchema = z
  .object({
    id: z.string().min(1),
    task: z.string().min(1),
    executor: z.string().min(1),
    template: z.string().min(1),
    context: z.record(z.unknown()).default({}),
    inputs: z.record(z.unknown()).default({}),
    executionSteps: z.array(z.string()),
    expectedOutputs: z.array(
      z
        .object({
          name: z.string().min(1),
          description: z.string().min(1),
          type: z.string().optional(),
        })
        .passthrough()
    ),
    successCriteria: z.array(z.string()),
    metadata: TaskMetadataSchema,
  })
  .passthrough();

export const TaskTokenUsageSchema = z
  .object({
    total: z.number().nonnegative(),
  })
  .passthrough();

export const ReviewDecisionSchema = z.enum(["approve", "revise", "reject"]);

export const TaskReviewSchema = z
  .object({
    reviewer: z.string().min(1),
    criteria: z.array(z.string()),
    decision: ReviewDecisionSchema,
    feedback: z.string().optional(),
    timestamp: z.string().datetime(),
  })
  .passthrough();

export const TaskExecutionSchema = z
  .object({
    status: z.enum(["running", "completed", "failed", "timed_out"]),
    agent: z.string().min(1),
    attempt: z.number().int().positive(),
    fallbackFrom: z.string().min(1).optional(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().optional(),
    durationMs: z.number().nonnegative().optional(),
    exitCode: z.number().int().nullable().optional(),
    signal: z.string().nullable().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export const TaskSchema = z
  .object({
    id: z.string().min(1),
    spec: TaskSpecSchema,
    executor: z.string().min(1),
    status: TaskStatusSchema,
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    report: z.record(z.unknown()).optional(),
    execution: TaskExecutionSchema.optional(),
    executionHistory: z.array(TaskExecutionSchema).default([]),
    review: TaskReviewSchema.optional(),
    tokenUsage: TaskTokenUsageSchema.optional(),
  })
  .passthrough();

export const WorkflowStatusSchema = z.enum(["pending", "in-progress", "completed", "failed"]);

export const WorkflowTokenUsageSchema = z
  .object({
    planning: z.number().nonnegative(),
    execution: z.number().nonnegative(),
    validation: z.number().nonnegative(),
    reporting: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })
  .passthrough();

export const WorkflowStateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    tasks: z.array(TaskSchema),
    currentTask: z.string().nullable(),
    status: WorkflowStatusSchema,
    tokenUsage: WorkflowTokenUsageSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
  })
  .passthrough();

export const TokenStageSchema = z.enum(["planning", "execution", "validation", "reporting"]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type TaskReview = z.infer<typeof TaskReviewSchema>;
export type TaskExecution = z.infer<typeof TaskExecutionSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type TokenStage = z.infer<typeof TokenStageSchema>;
