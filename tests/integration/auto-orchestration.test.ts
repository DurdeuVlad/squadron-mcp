import { afterEach, describe, expect, it } from "vitest";

import { createAutoOrchestrateTool } from "../../src/tools/auto-orchestrate.js";

afterEach(() => {
  delete process.env.YOLO_MODE_CONFIDENCE;
  delete process.env.AUTO_TRIGGER_CONFIDENCE;
  delete process.env.AUTO_TRIGGER_ASK_FIRST;
});

describe("auto-orchestration integration", () => {
  it("runs workflow end-to-end for implementation request", async () => {
    process.env.YOLO_MODE_CONFIDENCE = "0.85";
    const tool = createAutoOrchestrateTool();
    const result = await tool.handler(
      tool.schema.parse({
        userMessage: "Implement video format templates with 8 tasks",
        context: {
          currentFolder: "sprints/sprint-014-format-templates",
        },
      })
    );

    expect(result.decision).toBe("trigger-workflow");
    expect(result.workflowParams?.taskCount).toBe(8);
    expect(result.workflowResult?.status).toBe("completed");
  });

  it("handles a broad scenario matrix (20+ prompts)", async () => {
    process.env.AUTO_TRIGGER_CONFIDENCE = "0.7";
    process.env.YOLO_MODE_CONFIDENCE = "0.95";
    process.env.AUTO_TRIGGER_ASK_FIRST = "true";
    const tool = createAutoOrchestrateTool();

    const scenarios = [
      "Implement format templates",
      "Build API gateway with 8 tasks",
      "Create rollout automation",
      "Fix all build issues",
      "Optimize reporting pipeline",
      "Refactor auth module",
      "Audit API from security perspective",
      "Analyze logs from reliability perspective",
      "Review workflows from fairness perspective",
      "Run workflow for sprint execution",
      "What is auto orchestration?",
      "How does confidence threshold work?",
      "Explain context detection",
      "Why use confirmation?",
      "Show me an example of audit mode",
      "Write a function to parse JSON",
      "Create a script for changelog",
      "Debug pipeline timeout",
      "Update docs links",
      "Modify CLI command options",
      "Continue this",
      "Implement this",
    ];

    const results = await Promise.all(
      scenarios.map((userMessage) =>
        tool.handler(
          tool.schema.parse({
            userMessage,
            context: {
              currentFolder: "sprints/sprint-006-auto-orchestration",
            },
          })
        )
      )
    );

    expect(results).toHaveLength(22);
    expect(results.some((result) => result.decision === "trigger-workflow")).toBe(true);
    expect(results.some((result) => result.decision === "ask-confirmation")).toBe(true);
    expect(results.some((result) => result.decision === "answer-directly")).toBe(true);
  });
});
