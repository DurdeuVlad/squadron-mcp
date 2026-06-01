import { describe, expect, it } from "vitest";

import { extractWorkflowParams } from "../../src/tools/extract-workflow-params.js";

describe("extractWorkflowParams", () => {
  it("extracts goal and default task count", () => {
    const result = extractWorkflowParams({
      userMessage: "Implement video format templates",
    });

    expect(result.goal).toBe("implement video format templates");
    expect(result.taskCount).toBe(6);
    expect(result.isAudit).toBe(false);
  });

  it("extracts perspective and audit template", () => {
    const result = extractWorkflowParams({
      userMessage: "Audit debate quality from fairness perspective",
    });

    expect(result.goal).toBe("audit debate quality");
    expect(result.perspective).toBe("fairness");
    expect(result.isAudit).toBe(true);
    expect(result.template).toBe("audit-workflow");
  });

  it("extracts explicit task count", () => {
    const result = extractWorkflowParams({
      userMessage: "Build dashboard with 8 tasks",
    });

    expect(result.taskCount).toBe(8);
  });
});
