import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG, OrchestratorConfigSchema } from "../../src/config/types.js";

describe("config types", () => {
  it("validates default config", () => {
    const parsed = OrchestratorConfigSchema.parse(DEFAULT_CONFIG);
    expect(parsed.agents.claude.role).toBe("planner");
    expect(parsed.delegationRuntime?.enabled).toBe(false);
    expect(parsed.delegationRuntime?.agents.gemini.command).toBe("gemini");
  });

  it("rejects invalid role values", () => {
    expect(() =>
      OrchestratorConfigSchema.parse({
        agents: {
          bad: {
            role: "invalid-role",
            capabilities: [],
          },
        },
      })
    ).toThrow();
  });

  it("validates delegation runtime overrides", () => {
    const parsed = OrchestratorConfigSchema.parse({
      ...DEFAULT_CONFIG,
      delegationRuntime: {
        enabled: true,
        defaultTimeoutMs: 30_000,
        maxOutputBytes: 65_536,
        fallbackOnFailure: true,
        fallbackExecutors: {
          claude: ["codex"],
          gemini: ["codex"],
          codex: [],
        },
        agents: {
          claude: {
            command: "claude",
            args: ["-p", "{prompt}"],
            successExitCodes: [0],
          },
          gemini: {
            command: "gemini",
            args: ["-p", "{prompt}"],
            successExitCodes: [0],
          },
          codex: {
            command: "codex",
            args: ["exec", "{prompt}"],
            successExitCodes: [0],
          },
        },
      },
    });

    expect(parsed.delegationRuntime?.enabled).toBe(true);
    expect(parsed.delegationRuntime?.defaultTimeoutMs).toBe(30_000);
  });
});
