import { describe, expect, it } from "vitest";

import { TaskSchema, WorkflowStateSchema } from "../../src/state/types.js";

describe("state schemas", () => {
  it("validates task state", () => {
    const task = TaskSchema.parse({
      id: "task-1",
      spec: {
        id: "task-1",
        task: "Implement feature",
        executor: "gemini",
        template: "typescript-feature",
        context: {},
        inputs: {},
        executionSteps: ["step one"],
        expectedOutputs: [{ name: "result", description: "output" }],
        successCriteria: ["done"],
        metadata: {
          created: new Date().toISOString(),
        },
      },
      executor: "gemini",
      status: "pending",
    });

    expect(task.id).toBe("task-1");
  });

  it("validates workflow state", () => {
    const now = new Date().toISOString();
    const workflow = WorkflowStateSchema.parse({
      id: "wf-1",
      name: "sample",
      tasks: [],
      currentTask: null,
      status: "pending",
      tokenUsage: {
        planning: 0,
        execution: 0,
        validation: 0,
        reporting: 0,
        total: 0,
      },
      startTime: now,
    });

    expect(workflow.status).toBe("pending");
  });
});
