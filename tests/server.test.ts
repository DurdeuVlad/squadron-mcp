import { describe, expect, it } from "vitest";

import { createServer } from "../src/index.js";

describe("createServer", () => {
  it("creates an MCP server with a default tool and prompt registry", () => {
    const { server, registry, promptRegistry } = createServer();

    expect(server).toBeDefined();
    expect(registry.listTools().length).toBeGreaterThan(0);
    expect(promptRegistry.listPrompts().length).toBeGreaterThan(0);
  });
});
