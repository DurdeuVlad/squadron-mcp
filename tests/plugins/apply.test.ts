import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { applyPlugins } from "../../src/plugins/apply.js";
import type { LoadedPlugin } from "../../src/plugins/loader.js";
import { PromptRegistry } from "../../src/prompts/registry.js";
import { TemplateLoader, TemplateRegistry } from "../../src/templates/loader.js";
import { createOrchestratorServices } from "../../src/tools/registry.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import { log } from "../../src/utils/logger.js";

vi.mock("../../src/utils/logger.js", () => ({
  log: vi.fn(),
}));

function makeTargets() {
  return {
    toolRegistry: new ToolRegistry(),
    promptRegistry: new PromptRegistry(),
    templateRegistry: new TemplateRegistry(new TemplateLoader("templates")),
  };
}

describe("applyPlugins", () => {
  it("applies a well-behaved plugin's tools, prompts, and templates", async () => {
    const targets = makeTargets();
    const services = createOrchestratorServices("templates");
    const plugins: LoadedPlugin[] = [
      {
        path: "/fake/good-plugin.js",
        plugin: {
          name: "good-plugin",
          registerTools: (registry) => {
            registry.register({
              name: "good_tool",
              description: "ok",
              inputSchema: { type: "object", properties: {} },
              schema: z.object({}),
              handler: async () => ({ ok: true }),
            });
          },
          registerPrompts: (registry) => {
            registry.register({
              name: "good_prompt",
              description: "ok",
              build: () => ({ messages: [{ role: "user", content: { type: "text", text: "hi" } }] }),
            });
          },
        },
      },
    ];

    await applyPlugins(plugins, targets, services);

    expect(targets.toolRegistry.listTools().map((t) => t.name)).toContain("good_tool");
    expect(targets.promptRegistry.listPrompts().map((p) => p.name)).toContain("good_prompt");
  });

  it("isolates a failing hook: a successful registerTools survives a throwing registerPrompts", async () => {
    const targets = makeTargets();
    const services = createOrchestratorServices("templates");
    const plugins: LoadedPlugin[] = [
      {
        path: "/fake/partial-plugin.js",
        plugin: {
          name: "partial-plugin",
          registerTools: (registry) => {
            registry.register({
              name: "surviving_tool",
              description: "should still register",
              inputSchema: { type: "object", properties: {} },
              schema: z.object({}),
              handler: async () => ({ ok: true }),
            });
          },
          registerPrompts: () => {
            throw new Error("registerPrompts blew up");
          },
        },
      },
    ];

    await applyPlugins(plugins, targets, services);

    expect(targets.toolRegistry.listTools().map((t) => t.name)).toContain("surviving_tool");
    expect(targets.promptRegistry.listPrompts()).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      "error",
      "plugin.hook_failed",
      expect.objectContaining({ plugin: "partial-plugin", hook: "registerPrompts" })
    );
  });

  it("isolates one plugin's failure from a second, independent plugin", async () => {
    const targets = makeTargets();
    const services = createOrchestratorServices("templates");
    const plugins: LoadedPlugin[] = [
      {
        path: "/fake/broken-plugin.js",
        plugin: {
          name: "broken-plugin",
          registerTools: () => {
            throw new Error("broken");
          },
        },
      },
      {
        path: "/fake/fine-plugin.js",
        plugin: {
          name: "fine-plugin",
          registerTools: (registry) => {
            registry.register({
              name: "fine_tool",
              description: "ok",
              inputSchema: { type: "object", properties: {} },
              schema: z.object({}),
              handler: async () => ({ ok: true }),
            });
          },
        },
      },
    ];

    await applyPlugins(plugins, targets, services);

    expect(targets.toolRegistry.listTools().map((t) => t.name)).toContain("fine_tool");
    expect(targets.toolRegistry.listTools().map((t) => t.name)).not.toContain("broken");
  });
});
