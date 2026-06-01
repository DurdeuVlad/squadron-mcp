import { afterEach, describe, expect, it } from "vitest";

import { createAutoOrchestrateTool } from "../../src/tools/auto-orchestrate.js";

const envKeys = [
  "AUTO_TRIGGER_WORKFLOWS",
  "AUTO_TRIGGER_CONFIDENCE",
  "YOLO_MODE_CONFIDENCE",
  "AUTO_TRIGGER_ASK_FIRST",
  "CONFIRMATION_TIMEOUT",
  "CONTEXT_DETECTION_ENABLED",
];

afterEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
});

describe("autoOrchestrateTool", () => {
  it("triggers workflow for high confidence requests", async () => {
    process.env.YOLO_MODE_CONFIDENCE = "0.85";
    const tool = createAutoOrchestrateTool();

    const result = await tool.handler(
      tool.schema.parse({
        userMessage: "Implement authentication workflow with 7 tasks",
      })
    );

    expect(result.decision).toBe("trigger-workflow");
    expect(result.workflowResult).toBeDefined();
    expect(result.progressUpdates?.length).toBeGreaterThan(0);
  });

  it("asks for confirmation in medium confidence band", async () => {
    process.env.AUTO_TRIGGER_CONFIDENCE = "0.7";
    process.env.YOLO_MODE_CONFIDENCE = "0.95";
    process.env.AUTO_TRIGGER_ASK_FIRST = "true";

    const tool = createAutoOrchestrateTool();
    const result = await tool.handler(
      tool.schema.parse({
        userMessage: "Implement this",
        context: {
          currentFolder: "sprints/sprint-006-auto-orchestration",
        },
      })
    );

    expect(result.decision).toBe("ask-confirmation");
    expect(result.confirmationMessage).toContain("Options:");
  });

  it("answers directly for simple questions", async () => {
    const tool = createAutoOrchestrateTool();
    const result = await tool.handler(
      tool.schema.parse({
        userMessage: "What is auto orchestration?",
      })
    );

    expect(result.decision).toBe("answer-directly");
  });
});
