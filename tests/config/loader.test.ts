import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { ConfigLoader, mergeWithDefaults } from "../../src/config/loader.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

describe("ConfigLoader", () => {
  it("loads and merges project config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "orchestrator-config-"));
    tempDirs.push(dir);
    const file = join(dir, "orchestrator-config.json");
    await writeFile(
      file,
      JSON.stringify({
        agents: {
          claude: {
            role: "planner",
            capabilities: ["planning"],
          },
          gemini: {
            role: "executor",
            capabilities: ["execution"],
          },
        },
        tokenOptimization: {
          enabled: true,
          savingsTarget: 0.7,
          reportSavings: true,
        },
        delegationRuntime: {
          enabled: true,
          defaultTimeoutMs: 45_000,
          agents: {
            gemini: {
              command: "gemini",
              args: ["-p", "{prompt}", "--output-format", "json"],
            },
          },
        },
      })
    );

    const loader = new ConfigLoader();
    const config = await loader.load(file);
    expect(config.tokenOptimization?.savingsTarget).toBe(0.7);
    expect(config.stateStorage).toBe("memory");
    expect(config.delegationRuntime?.enabled).toBe(true);
    expect(config.delegationRuntime?.agents.gemini.command).toBe("gemini");
    expect(config.delegationRuntime?.agents.claude.command).toBe("claude");
  });

  it("returns defaults when file is missing", async () => {
    const loader = new ConfigLoader();
    const config = await loader.load("missing-config.json");
    expect(config.agents.claude.role).toBe("planner");
  });

  it("merges partial config with defaults", () => {
    const merged = mergeWithDefaults({
      agents: {
        claude: {
          role: "planner",
          capabilities: ["planning", "review"],
        },
      },
      delegationRuntime: {
        enabled: true,
        agents: {
          codex: {
            command: "codex",
            args: ["exec", "{prompt}"],
          },
        },
      },
    });

    expect(merged.agents.gemini).toBeDefined();
    expect(merged.roleBoundaries?.enforce).toBe(true);
    expect(merged.delegationRuntime?.enabled).toBe(true);
    expect(merged.delegationRuntime?.agents.claude.command).toBe("claude");
    expect(merged.delegationRuntime?.agents.codex.command).toBe("codex");
  });
});
