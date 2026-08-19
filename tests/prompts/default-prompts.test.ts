import { describe, expect, it } from "vitest";

import { createDefaultPromptRegistry } from "../../src/prompts/index.js";

describe("createDefaultPromptRegistry", () => {
  it("registers all four built-in prompts without throwing", () => {
    const registry = createDefaultPromptRegistry();
    const names = registry.listPrompts().map((p) => p.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "plan_delegation",
        "review_report",
        "track_workflow_status",
        "optimize_tokens",
      ])
    );
  });

  it("every prompt builds a valid GetPromptResult with no arguments", async () => {
    const registry = createDefaultPromptRegistry();
    for (const prompt of registry.listPrompts()) {
      const result = await registry.get(prompt.name);
      expect(result.messages.length).toBeGreaterThan(0);
      for (const message of result.messages) {
        expect(["user", "assistant"]).toContain(message.role);
      }
    }
  });

  it("every prompt builds a valid GetPromptResult when passed its declared arguments", async () => {
    const registry = createDefaultPromptRegistry();
    for (const prompt of registry.listPrompts()) {
      const args = Object.fromEntries(
        (prompt.arguments ?? []).map((arg) => [arg.name, `test-${arg.name}`])
      );
      const result = await registry.get(prompt.name, args);
      expect(result.messages.length).toBeGreaterThan(0);
    }
  });

  it("actually interpolates each declared argument's value into the built message text", async () => {
    const registry = createDefaultPromptRegistry();
    for (const prompt of registry.listPrompts()) {
      const args = Object.fromEntries(
        (prompt.arguments ?? []).map((arg) => [arg.name, `test-value-${arg.name}`])
      );
      const result = await registry.get(prompt.name, args);
      const combinedText = result.messages
        .map((message) =>
          message.content.type === "text" ? message.content.text : ""
        )
        .join("\n");

      for (const arg of prompt.arguments ?? []) {
        expect(
          combinedText,
          `${prompt.name}: expected test-value-${arg.name} to appear in the built prompt text`
        ).toContain(`test-value-${arg.name}`);
      }
    }
  });

  it("plan_delegation requires taskDescription and marks constraints optional", () => {
    const registry = createDefaultPromptRegistry();
    const def = registry.listPrompts().find((p) => p.name === "plan_delegation");

    expect(def?.arguments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "taskDescription", required: true }),
        expect.objectContaining({ name: "constraints", required: false }),
      ])
    );
  });
});
