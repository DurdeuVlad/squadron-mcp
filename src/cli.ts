#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_CONFIG } from "./config/types.js";
import { createDashboardServer } from "./dashboard/server.js";
import { runInitWizard } from "./setup/wizard.js";
import { createTaskSpecTool } from "./tools/create-task-spec.js";
import { createOrchestratorServicesFromConfig, type OrchestratorServices } from "./tools/registry.js";
import { trackWorkflowTool } from "./tools/track-workflow.js";

interface CliContext {
  out: (message: string) => void;
  err: (message: string) => void;
}

const defaultContext: CliContext = {
  out: (message) => console.log(message),
  err: (message) => console.error(message),
};

function parseRecord(entries: string[] = []): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const entry of entries) {
    const [key, ...rest] = entry.split("=");
    if (!key || rest.length === 0) {
      throw new Error(`Invalid key=value pair: ${entry}`);
    }

    const raw = rest.join("=");
    try {
      output[key] = JSON.parse(raw) as unknown;
    } catch {
      output[key] = raw;
    }
  }

  return output;
}

function formatAggregateMetrics(services: OrchestratorServices): string {
  const workflows = services.stateManager.listWorkflows();
  if (workflows.length === 0) {
    return "No workflows found.";
  }

  let totalTokens = 0;
  let totalSavings = 0;
  let totalCost = 0;

  for (const workflow of workflows) {
    const metrics = services.tokenTracker.calculateSavings(workflow.id);
    totalTokens += metrics.totalTokens;
    totalSavings += metrics.savingsVsBaseline;
    totalCost += metrics.cost;
  }

  return [
    "**Aggregate Metrics**",
    "",
    `Workflows: ${workflows.length}`,
    `Total tokens: ${totalTokens}`,
    `Total savings: ${totalSavings}`,
    `Total cost: $${totalCost.toFixed(4)}`,
  ].join("\n");
}

async function loadServices(configPath: string, templatesDir: string): Promise<OrchestratorServices> {
  const services = await createOrchestratorServicesFromConfig(templatesDir, configPath);
  await services.templateRegistry.initialize();
  return services;
}

export function createCli(context: CliContext = defaultContext): Command {
  const program = new Command();

  program.name("squadron").description("CLI for Squadron").version("0.1.0");

  program
    .command("init")
    .description("Initialize orchestrator config and folders in current directory")
    .option("--config <path>", "Config file path", "squadron-config.json")
    .option("--templates-dir <path>", "Templates directory", "templates")
    .option("--force", "Overwrite existing config file", false)
    .option("--yes", "Skip the interactive wizard, use flags/defaults only", false)
    .action(
      async (options: { config: string; templatesDir: string; force: boolean; yes: boolean }) => {
        // Require both stdout and stdin to be a TTY - if stdin is piped/redirected
        // (e.g. `squadron init < /dev/null`), the wizard's prompts would hang
        // waiting for input that will never come, so fall back to non-interactive.
        const interactive =
          Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY) && !options.yes;

        if (interactive) {
          await runInitWizard(
            { config: options.config, templatesDir: options.templatesDir, force: options.force },
            context
          );
          return;
        }

        const configPath = resolve(options.config);
        const templatesDir = resolve(options.templatesDir);
        const initialConfig = {
          ...DEFAULT_CONFIG,
          stateStorage: "file" as const,
        };

        if (existsSync(configPath) && !options.force) {
          context.out(`Config already exists at ${configPath}. Use --force to overwrite.`);
        } else {
          writeFileSync(configPath, `${JSON.stringify(initialConfig, null, 2)}\n`, "utf8");
          context.out(`Wrote config: ${configPath}`);
        }

        mkdirSync(templatesDir, { recursive: true });
        mkdirSync(resolve("state"), { recursive: true });
        context.out(`Ensured directories: ${templatesDir}, ${resolve("state")}`);
      }
    );

  const task = program.command("task").description("Task operations");
  task
    .command("create")
    .description("Create a task spec from a template")
    .requiredOption("--task <task>", "Task description")
    .option("--executor <executor>", "Executor agent", "gemini")
    .option("--template <template>", "Template name", "typescript-feature")
    .option("--workflow-id <workflowId>", "Attach task to existing workflow")
    .option("--planner <planner>", "Planner agent", "claude")
    .option("--context <key=value...>", "Context key=value pairs")
    .option("--input <key=value...>", "Input key=value pairs")
    .option("--config <path>", "Config path", "squadron-config.json")
    .option("--templates-dir <path>", "Templates directory", "templates")
    .action(
      async (options: {
        task: string;
        executor: "claude" | "gemini" | "codex";
        template: string;
        workflowId?: string;
        planner: string;
        context?: string[];
        input?: string[];
        config: string;
        templatesDir: string;
      }) => {
        const services = await loadServices(options.config, options.templatesDir);
        const tool = createTaskSpecTool({
          templateRegistry: services.templateRegistry,
          stateManager: services.stateManager,
          roleEnforcer: services.roleEnforcer,
        });

        const result = await tool.handler(
          tool.schema.parse({
            task: options.task,
            executor: options.executor,
            template: options.template,
            workflowId: options.workflowId,
            planner: options.planner,
            context: parseRecord(options.context),
            inputs: parseRecord(options.input),
          })
        );

        context.out(JSON.stringify(result, null, 2));
      }
    );

  const workflow = program.command("workflow").description("Workflow operations");
  workflow
    .command("track <workflowId>")
    .description("Track workflow progress")
    .option("--config <path>", "Config path", "squadron-config.json")
    .option("--templates-dir <path>", "Templates directory", "templates")
    .action(async (workflowId: string, options: { config: string; templatesDir: string }) => {
      const services = await loadServices(options.config, options.templatesDir);
      const tool = trackWorkflowTool({ stateManager: services.stateManager });
      const result = await tool.handler(tool.schema.parse({ workflowId }));
      context.out(result.summary);
    });

  program
    .command("metrics")
    .description("Show token usage metrics")
    .option("--workflow <workflowId>", "Specific workflow id")
    .option("--config <path>", "Config path", "squadron-config.json")
    .option("--templates-dir <path>", "Templates directory", "templates")
    .action(async (options: { workflow?: string; config: string; templatesDir: string }) => {
      const services = await loadServices(options.config, options.templatesDir);
      if (options.workflow) {
        context.out(services.tokenTracker.generateReport(options.workflow));
        return;
      }

      context.out(formatAggregateMetrics(services));
    });

  program
    .command("dashboard")
    .description("Start monitoring dashboard")
    .option("--port <port>", "Dashboard port", "3000")
    .option("--config <path>", "Config path", "squadron-config.json")
    .option("--templates-dir <path>", "Templates directory", "templates")
    .action(async (options: { port: string; config: string; templatesDir: string }) => {
      const services = await loadServices(options.config, options.templatesDir);
      const dashboard = createDashboardServer(services, { port: Number(options.port) });
      const port = await dashboard.start();
      context.out(`Dashboard running at http://localhost:${port}`);
    });

  program.showHelpAfterError();
  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  const cli = createCli();
  try {
    await cli.parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    defaultContext.err(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && /cli\.(js|ts)$/u.test(process.argv[1])) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    defaultContext.err(message);
    process.exit(1);
  });
}
