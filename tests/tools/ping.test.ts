import { describe, expect, it } from "vitest";

import { pingTool } from "../../src/tools/ping.js";

describe("pingTool", () => {
  it("returns pong and default echo", async () => {
    const input = pingTool.schema.parse({});
    const result = await pingTool.handler(input);

    expect(result.response).toBe("pong");
    expect(result.echo).toBe("no message");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it("echoes provided message", async () => {
    const input = pingTool.schema.parse({ message: "hello" });
    const result = await pingTool.handler(input);

    expect(result.echo).toBe("hello");
  });
});
