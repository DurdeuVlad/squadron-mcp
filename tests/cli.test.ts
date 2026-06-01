import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createCli } from "../src/cli.js";
import { DEFAULT_CONFIG, type OrchestratorConfig } from "../src/config/types.js";
import { createOrchestratorServices } from "../src/tools/registry.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
  delete process.env.ORCHESTRATOR_STATE_DIR;
});

function makeTempProject(): { dir: string; configPath: string; templatesDir: string; stateDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "orchestrator-cli-"));
  tempDirs.push(dir);
  const configPath = join(dir, "orchestrator-config.json");
  const templatesDir = resolve("templates");
  const stateDir = join(dir, "state");

  const config = {
    ...DEFAULT_CONFIG,
    stateStorage: "file",
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  return { dir, configPath, templatesDir, stateDir };
}

describe("CLI", () => {
  it("initializes config and directories", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrator-cli-init-"));
    tempDirs.push(dir);
    const output: string[] = [];
    const errors: string[] = [];
    const originalCwd = process.cwd();
    process.chdir(dir);

    try {
      const cli = createCli({
        out: (message) => output.push(message),
        err: (message) => errors.push(message),
      });
      await cli.parseAsync(["node", "agent-orchestra", "init"]);
    } finally {
      process.chdir(originalCwd);
    }

    expect(errors).toEqual([]);
    expect(output.some((line) => line.includes("Wrote config"))).toBe(true);
    const parsed = JSON.parse(
      readFileSync(join(dir, "orchestrator-config.json"), "utf8")
    ) as OrchestratorConfig;
    expect(parsed.stateStorage).toBe("file");
  });

  it("creates a task and prints metrics for persisted state", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const { configPath, templatesDir, stateDir } = makeTempProject();
    process.env.ORCHESTRATOR_STATE_DIR = stateDir;

    await createCli({
      out: (message) => output.push(message),
      err: (message) => errors.push(message),
    }).parseAsync([
      "node",
      "agent-orchestra",
      "task",
      "create",
      "--task",
      "CLI created task",
      "--template",
      "typescript-feature",
      "--input",
      "feature=CLI created task",
      "--input",
      "files=[\"src/index.ts\"]",
      "--config",
      configPath,
      "--templates-dir",
      templatesDir,
    ]);

    await createCli({
      out: (message) => output.push(message),
      err: (message) => errors.push(message),
    }).parseAsync([
      "node",
      "agent-orchestra",
      "metrics",
      "--config",
      configPath,
      "--templates-dir",
      templatesDir,
    ]);

    expect(errors).toEqual([]);
    expect(output.some((line) => line.includes("\"taskId\""))).toBe(true);
    expect(
      output.some(
        (line) => line.includes("Aggregate Metrics") || line.includes("No workflows found")
      )
    ).toBe(true);
  });

  it("tracks workflow created outside CLI", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const { configPath, templatesDir, stateDir } = makeTempProject();
    process.env.ORCHESTRATOR_STATE_DIR = stateDir;

    const services = createOrchestratorServices(templatesDir, {
      ...DEFAULT_CONFIG,
      stateStorage: "file",
    });
    const workflow = services.stateManager.createWorkflow("cli-track");
    services.stateManager.createTask({
      id: "cli-track-task",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: {
        created: new Date().toISOString(),
      },
    });
    services.stateManager.addTaskToWorkflow(workflow.id, "cli-track-task");

    const cli = createCli({
      out: (message) => output.push(message),
      err: (message) => errors.push(message),
    });
    await cli.parseAsync([
      "node",
      "agent-orchestra",
      "workflow",
      "track",
      workflow.id,
      "--config",
      configPath,
      "--templates-dir",
      templatesDir,
    ]);

    expect(errors).toEqual([]);
    expect(output.join("\n")).toContain(`Workflow ${workflow.id}`);
  });
});
