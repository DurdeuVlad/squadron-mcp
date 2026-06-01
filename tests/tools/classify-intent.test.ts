import { describe, expect, it } from "vitest";

import { classifyIntent } from "../../src/tools/classify-intent.js";

describe("classifyIntent", () => {
  it("classifies clear workflow requests", () => {
    const result = classifyIntent({
      userMessage: "Implement format templates for debates",
    });

    expect(result.type).toBe("workflow-candidate");
    expect(result.recommendedAction).toBe("trigger-workflow");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("classifies simple questions", () => {
    const result = classifyIntent({
      userMessage: "What are format templates?",
    });

    expect(result.type).toBe("simple-question");
    expect(result.recommendedAction).toBe("answer-directly");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("classifies coding asks as complex-task when workflow patterns are absent", () => {
    const result = classifyIntent({
      userMessage: "Write a function to parse markdown",
    });

    expect(result.type).toBe("complex-task");
    expect(result.recommendedAction).toBe("use-mcp-tool");
  });
});
