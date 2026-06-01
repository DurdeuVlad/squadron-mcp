import { describe, expect, it } from "vitest";
import { z } from "zod";

import { wrapTool } from "../../src/utils/tool-wrapper.js";
import type { ToolDefinition } from "../../src/tools/types.js";

describe("wrapTool", () => {
  const demoTool: ToolDefinition<{ value: string }, { echoed: string }> = {
    name: "demo",
    description: "Demo tool",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "string" },
      },
      required: ["value"],
    },
    schema: z.object({
      value: z.string().min(1),
    }),
    handler: async (input) => ({ echoed: input.value }),
  };

  it("executes with validated input", async () => {
    const wrapped = wrapTool(demoTool);
    const result = await wrapped.execute({ value: "ok" });

    expect(result.echoed).toBe("ok");
  });

  it("throws on invalid input", async () => {
    const wrapped = wrapTool(demoTool);

    await expect(wrapped.execute({})).rejects.toThrow();
  });

  it("supports undefined input by validating against defaults", async () => {
    const defaultTool: ToolDefinition<{ value: string }, { echoed: string }> = {
      name: "defaultable",
      description: "Defaults input",
      inputSchema: {
        type: "object",
        properties: {},
      },
      schema: z.object({
        value: z.string().default("fallback"),
      }),
      handler: async (input) => ({ echoed: input.value }),
    };

    const wrapped = wrapTool(defaultTool);
    await expect(wrapped.execute(undefined)).resolves.toEqual({ echoed: "fallback" });
  });

  it("surfaces handler errors", async () => {
    const failingTool: ToolDefinition<{ value: string }, { echoed: string }> = {
      ...demoTool,
      handler: async () => {
        throw new Error("boom");
      },
    };

    const wrapped = wrapTool(failingTool);
    await expect(wrapped.execute({ value: "x" })).rejects.toThrow("boom");
  });

  it("normalizes non-error throws", async () => {
    const oddTool: ToolDefinition<{ value: string }, { echoed: string }> = {
      ...demoTool,
      handler: async () => {
        throw "bad";
      },
    };

    const wrapped = wrapTool(oddTool);
    await expect(wrapped.execute({ value: "x" })).rejects.toThrow("Unknown tool error.");
  });
});
