import { describe, expect, it } from "vitest";

import {
  applyContextToClassification,
  applyContextToParams,
  detectContext,
} from "../../src/tools/detect-context.js";

describe("detectContext", () => {
  it("detects sprint folder metadata", () => {
    const context = detectContext({
      currentFolder: "c:/workspace/sprints/sprint-014-format-templates",
    });

    expect(context.inSprintFolder).toBe(true);
    expect(context.sprintNumber).toBe(14);
    expect(context.suggestedTemplate).toBe("continue-sprint");
    expect(context.suggestedGoal).toContain("sprint 014");
  });

  it("detects test folder template hint", () => {
    const context = detectContext({
      currentFolder: "c:/workspace/tests/unit",
    });
    expect(context.inTestFolder).toBe(true);
    expect(context.suggestedTemplate).toBe("write-tests");
  });

  it("applies confidence boosts and context goal inference", () => {
    const context = detectContext({
      currentFolder: "c:/workspace/sprints/sprint-006-auto-orchestration",
    });

    const boosted = applyContextToClassification(
      { confidence: 0.8, suggestedTemplate: "user-standard-workflow" },
      context
    );
    expect(boosted.confidence).toBeGreaterThan(0.8);

    const params = applyContextToParams(
      {
        goal: "continue",
        confidence: 0.6,
        taskCount: 6,
      },
      context
    );
    expect(params.contextInferred).toBe(true);
    expect(params.goal).toContain("sprint 006");
  });
});
