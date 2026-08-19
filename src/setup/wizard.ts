import { cancel, confirm, intro, isCancel, note, outro, text } from "@clack/prompts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_CONFIG } from "../config/types.js";
import { detectAgentAuth, type AgentName } from "./auth-detection.js";
import { generateMcpClientConfigSnippet } from "./client-config.js";

export interface InitWizardOptions {
  config: string;
  templatesDir: string;
  force: boolean;
}

export interface InitWizardContext {
  out: (message: string) => void;
  err: (message: string) => void;
}

const AGENT_NAMES: AgentName[] = ["claude", "gemini", "codex"];

function formatAuthStatus(): string {
  const auth = detectAgentAuth();
  return AGENT_NAMES.map((agent) => {
    const status = auth[agent];
    const icon = status.method === "global-cli" ? "🌐" : status.method === "api-key" ? "🔑" : "❌";
    const label =
      status.method === "global-cli"
        ? "global CLI login detected"
        : status.method === "api-key"
          ? "API key env var set"
          : "no credentials found";
    return `${icon} ${agent}: ${label}`;
  }).join("\n");
}

/**
 * Interactive setup flow for `squadron init` when run in a TTY. Preserves
 * the exact same end state as the non-interactive flag-driven init (same
 * config shape, same directories created) - this only adds prompts and
 * the MCP client config snippet on top, it doesn't change what gets written.
 */
export async function runInitWizard(
  options: InitWizardOptions,
  context: InitWizardContext
): Promise<void> {
  intro("Squadron setup");
  note(formatAuthStatus(), "Authentication status");

  const configPathInput = await text({
    message: "Config file path",
    initialValue: options.config,
  });
  if (isCancel(configPathInput)) {
    cancel("Setup cancelled.");
    return;
  }

  const templatesDirInput = await text({
    message: "Templates directory",
    initialValue: options.templatesDir,
  });
  if (isCancel(templatesDirInput)) {
    cancel("Setup cancelled.");
    return;
  }

  const configPath = resolve(configPathInput);
  const templatesDir = resolve(templatesDirInput);

  let shouldWrite = true;
  if (existsSync(configPath) && !options.force) {
    const overwrite = await confirm({
      message: `Config already exists at ${configPath}. Overwrite?`,
      initialValue: false,
    });
    if (isCancel(overwrite)) {
      cancel("Setup cancelled.");
      return;
    }
    shouldWrite = overwrite;
  }

  if (shouldWrite) {
    const initialConfig = { ...DEFAULT_CONFIG, stateStorage: "file" as const };
    writeFileSync(configPath, `${JSON.stringify(initialConfig, null, 2)}\n`, "utf8");
    context.out(`Wrote config: ${configPath}`);
  } else {
    context.out(`Kept existing config: ${configPath}`);
  }

  mkdirSync(templatesDir, { recursive: true });
  mkdirSync(resolve("state"), { recursive: true });
  context.out(`Ensured directories: ${templatesDir}, ${resolve("state")}`);

  const snippet = generateMcpClientConfigSnippet();
  note(
    JSON.stringify(snippet, null, 2),
    "MCP client config (add to e.g. ~/.config/claude/mcp.json)"
  );

  const writeSnippet = await confirm({
    message: "Write this snippet to mcp-client-config.json in the current directory?",
    initialValue: false,
  });
  if (!isCancel(writeSnippet) && writeSnippet) {
    const snippetPath = resolve("mcp-client-config.json");
    writeFileSync(snippetPath, `${JSON.stringify(snippet, null, 2)}\n`, "utf8");
    context.out(`Wrote MCP client config snippet: ${snippetPath}`);
  }

  outro("Squadron is ready. Run `squadron dashboard` to monitor workflows, or connect your MCP client now.");
}
