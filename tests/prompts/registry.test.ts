import { describe, expect, it } from "vitest";

import { PromptRegistry } from "../../src/prompts/registry.js";
import type { PromptDefinition } from "../../src/prompts/types.js";

function makePrompt(overrides: Partial<PromptDefinition> = {}): PromptDefinition {
  return {
    name: "example_prompt",
    description: "An example prompt",
    arguments: [{ name: "who", required: true }],
    build: (args) => ({
      messages: [
        { role: "user", content: { type: "text", text: `Hello, ${args?.who ?? "world"}!` } },
      ],
    }),
    ...overrides,
  };
}

describe("PromptRegistry", () => {
  it("lists registered prompts in MCP shape", () => {
    const registry = new PromptRegistry([makePrompt()]);
    const prompts = registry.listPrompts();

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      name: "example_prompt",
      description: "An example prompt",
      arguments: [{ name: "who", required: true }],
    });
  });

  it("throws when registering a duplicate name", () => {
    const registry = new PromptRegistry([makePrompt()]);
    expect(() => registry.register(makePrompt())).toThrow("Prompt already registered: example_prompt");
  });

  it("builds a prompt result with substituted arguments", async () => {
    const registry = new PromptRegistry([makePrompt()]);
    const result = await registry.get("example_prompt", { who: "Squadron" });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({ type: "text", text: "Hello, Squadron!" });
  });

  it("throws for an unknown prompt name", async () => {
    const registry = new PromptRegistry([]);
    await expect(registry.get("missing_prompt")).rejects.toThrow("Unknown prompt: missing_prompt");
  });
});
