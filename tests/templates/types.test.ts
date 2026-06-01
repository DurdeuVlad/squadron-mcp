import { describe, expect, it } from "vitest";

import {
  TaskTemplateSchema,
  TemplateSchema,
  WorkflowTemplateSchema,
} from "../../src/templates/types.js";

describe("template schemas", () => {
  it("validates task templates", () => {
    const parsed = TaskTemplateSchema.parse({
      name: "demo",
      description: "demo template",
      inputs: [{ name: "file", type: "file", required: true }],
      executionSteps: ["read", "analyze"],
      expectedOutputs: [{ name: "report", description: "result" }],
      successCriteria: ["complete"],
    });

    expect(parsed.name).toBe("demo");
  });

  it("validates workflow templates", () => {
    const parsed = WorkflowTemplateSchema.parse({
      name: "workflow-demo",
      description: "workflow",
      workflow: [{ step: "requirements" }, { step: "execution" }],
    });

    expect(parsed.workflow.length).toBe(2);
  });

  it("rejects invalid templates", () => {
    expect(() => TemplateSchema.parse({ name: "bad-template" })).toThrow();
  });
});
