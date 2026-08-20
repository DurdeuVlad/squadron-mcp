import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/index.js", () => ({
  startServer: vi.fn().mockResolvedValue(undefined),
}));

import { createCli, runCli } from "../src/cli.js";
import { DEFAULT_CONFIG, type OrchestratorConfig } from "../src/config/types.js";
import { startServer } from "../src/index.js";
import { createOrchestratorServices } from "../src/tools/registry.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
  delete process.env.SQUADRON_STATE_DIR;
});

function makeTempProject(): { dir: string; configPath: string; templatesDir: string; stateDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "orchestrator-cli-"));
  tempDirs.push(dir);
  const configPath = join(dir, "squadron-config.json");
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
      await cli.parseAsync(["node", "squadron", "init"]);
    } finally {
      process.chdir(originalCwd);
    }

    expect(errors).toEqual([]);
    expect(output.some((line) => line.includes("Wrote config"))).toBe(true);
    const parsed = JSON.parse(
      readFileSync(join(dir, "squadron-config.json"), "utf8")
    ) as OrchestratorConfig;
    expect(parsed.stateStorage).toBe("file");

    expect(output.some((line) => line.includes("Copied built-in templates"))).toBe(true);
    const scaffoldedTemplate = JSON.parse(
      readFileSync(join(dir, "templates", "typescript-feature.json"), "utf8")
    ) as { name: string };
    expect(scaffoldedTemplate.name).toBe("typescript-feature");
  });

  it("stays non-interactive when stdout is a TTY but stdin is not (piped/redirected input)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orchestrator-cli-init-tty-"));
    tempDirs.push(dir);
    const output: string[] = [];
    const errors: string[] = [];
    const originalCwd = process.cwd();
    const originalStdoutIsTTY = process.stdout.isTTY;
    const originalStdinIsTTY = process.stdin.isTTY;
    process.chdir(dir);
    // Simulate a TTY stdout with piped stdin - the wizard must not launch here,
    // or it would hang waiting for input that will never come.
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });

    try {
      const cli = createCli({
        out: (message) => output.push(message),
        err: (message) => errors.push(message),
      });
      await cli.parseAsync(["node", "squadron", "init"]);
    } finally {
      process.chdir(originalCwd);
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalStdoutIsTTY,
        configurable: true,
      });
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalStdinIsTTY,
        configurable: true,
      });
    }

    expect(errors).toEqual([]);
    expect(output.some((line) => line.includes("Wrote config"))).toBe(true);
    const parsedTtyCase = JSON.parse(
      readFileSync(join(dir, "squadron-config.json"), "utf8")
    ) as OrchestratorConfig;
    expect(parsedTtyCase.stateStorage).toBe("file");
  });

  it("creates a task and prints metrics for persisted state", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const { configPath, templatesDir, stateDir } = makeTempProject();
    process.env.SQUADRON_STATE_DIR = stateDir;

    await createCli({
      out: (message) => output.push(message),
      err: (message) => errors.push(message),
    }).parseAsync([
      "node",
      "squadron",
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
      "squadron",
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
    process.env.SQUADRON_STATE_DIR = stateDir;

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
      "squadron",
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

  it("reports honest aggregate metrics with no fabricated savings language", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const { configPath, templatesDir, stateDir } = makeTempProject();
    process.env.SQUADRON_STATE_DIR = stateDir;

    const services = createOrchestratorServices(templatesDir, {
      ...DEFAULT_CONFIG,
      stateStorage: "file",
    });
    const workflow = services.stateManager.createWorkflow("cli-metrics");
    services.stateManager.createTask({
      id: "cli-metrics-task",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: { created: new Date().toISOString() },
    });
    services.stateManager.addTaskToWorkflow(workflow.id, "cli-metrics-task");
    services.tokenTracker.trackTokenUsage(workflow.id, "gemini", "execution", 100);

    const cli = createCli({
      out: (message) => output.push(message),
      err: (message) => errors.push(message),
    });
    await cli.parseAsync([
      "node",
      "squadron",
      "metrics",
      "--config",
      configPath,
      "--templates-dir",
      templatesDir,
    ]);

    expect(errors).toEqual([]);
    const report = output.join("\n");
    expect(report).toContain("Tasks: 1");
    expect(report).toContain("Avg tokens/task: 100");
    expect(report).not.toMatch(/savings/iu);
  });

  it("starts the MCP server on a bare invocation with no subcommand", async () => {
    vi.mocked(startServer).mockClear();

    // This is exactly what argv looks like for `node dist/cli.js` with no
    // args, and for an npm bin-shim invocation like `npx squadron-mcp` --
    // the shape the generated mcpServers client config actually runs.
    await runCli(["node", "squadron"]);

    expect(startServer).toHaveBeenCalledTimes(1);
  });

  it("does not start the MCP server when a subcommand is given", async () => {
    vi.mocked(startServer).mockClear();
    const { configPath, templatesDir } = makeTempProject();

    await runCli(["node", "squadron", "metrics", "--config", configPath, "--templates-dir", templatesDir]);

    expect(startServer).not.toHaveBeenCalled();
  });
});
