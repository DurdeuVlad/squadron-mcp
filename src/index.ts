import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { log } from "./utils/logger.js";
import { getPackageVersion } from "./utils/package-info.js";
import { createDefaultPromptRegistry } from "./prompts/index.js";
import type { PromptRegistry } from "./prompts/registry.js";
import { applyPlugins } from "./plugins/apply.js";
import { loadPlugins } from "./plugins/loader.js";
import { detectAgentAuth } from "./setup/auth-detection.js";
import {
  createDefaultToolRegistry,
  createOrchestratorServices,
  createOrchestratorServicesFromConfig,
  type OrchestratorServices,
  type ToolRegistry,
} from "./tools/registry.js";

export interface CreateServerResult {
  server: Server;
  registry: ToolRegistry;
  promptRegistry: PromptRegistry;
  services: OrchestratorServices;
}

export function createServer(
  registry?: ToolRegistry,
  services: OrchestratorServices = createOrchestratorServices(),
  promptRegistry?: PromptRegistry
): CreateServerResult {
  const resolvedRegistry = registry ?? createDefaultToolRegistry(services);
  const resolvedPromptRegistry = promptRegistry ?? createDefaultPromptRegistry(services);
  const server = new Server(
    {
      name: "squadron",
      version: getPackageVersion(),
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: resolvedRegistry.listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return resolvedRegistry.invoke(request.params.name, request.params.arguments);
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: resolvedPromptRegistry.listPrompts(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    return resolvedPromptRegistry.get(request.params.name, request.params.arguments);
  });

  return { server, registry: resolvedRegistry, promptRegistry: resolvedPromptRegistry, services };
}

export async function startServer(): Promise<void> {
  const services = await createOrchestratorServicesFromConfig();
  await services.templateRegistry.initialize();

  const auth = detectAgentAuth();
  log("info", "auth.status", {
    claude: auth.claude.method,
    gemini: auth.gemini.method,
    codex: auth.codex.method,
  });

  const { server, registry, promptRegistry } = createServer(undefined, services);

  const pluginPaths = services.config.plugins ?? [];
  const loadedPlugins = await loadPlugins(pluginPaths, process.cwd());
  await applyPlugins(
    loadedPlugins,
    { toolRegistry: registry, promptRegistry, templateRegistry: services.templateRegistry },
    services
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "server.started", {
    transport: "stdio",
    templatesLoaded: services.templateRegistry.listNames().length,
    roleBoundaryEnforcement: services.config.roleBoundaries?.enforce ?? false,
    tokenOptimization: services.config.tokenOptimization?.enabled ?? false,
    pluginsConfigured: pluginPaths.length,
    pluginsLoaded: loadedPlugins.length,
  });
}

function isMainModule(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  try {
    // Resolve symlinks (e.g. an npm bin shim) before comparing against
    // import.meta.url, which Node always resolves to the real file path.
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    log("error", "server.failed", { error: message });
    process.exit(1);
  });
}
