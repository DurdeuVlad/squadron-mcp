import { describe, expect, it } from "vitest";

import { createServer } from "../src/index.js";

describe("createServer", () => {
  it("creates an MCP server with a default registry", () => {
    const { server, registry } = createServer();

    expect(server).toBeDefined();
    expect(registry.listTools().length).toBeGreaterThan(0);
  });
});
