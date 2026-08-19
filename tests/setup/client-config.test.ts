import { describe, expect, it } from "vitest";

import { generateMcpClientConfigSnippet } from "../../src/setup/client-config.js";

describe("generateMcpClientConfigSnippet", () => {
  it("defaults to the real squadron package/bin/server names", () => {
    const snippet = generateMcpClientConfigSnippet();

    expect(snippet).toEqual({
      mcpServers: {
        squadron: {
          command: "npx",
          args: ["squadron-mcp"],
        },
      },
    });
  });

  it("accepts overrides for command/args/serverName", () => {
    const snippet = generateMcpClientConfigSnippet({
      command: "node",
      args: ["./dist/index.js"],
      serverName: "squadron-dev",
    });

    expect(snippet).toEqual({
      mcpServers: {
        "squadron-dev": {
          command: "node",
          args: ["./dist/index.js"],
        },
      },
    });
  });
});
