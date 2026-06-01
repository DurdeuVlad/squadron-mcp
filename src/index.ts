import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";

import { log } from "./utils/logger.js";
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
  services: OrchestratorServices;
}

export function createServer(
  registry?: ToolRegistry,
  services: OrchestratorServices = createOrchestratorServices()
): CreateServerResult {
  const resolvedRegistry = registry ?? createDefaultToolRegistry(services);
  const server = new Server(
    {
      name: "agent-orchestrator",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: resolvedRegistry.listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return resolvedRegistry.invoke(request.params.name, request.params.arguments);
  });

  return { server, registry: resolvedRegistry, services };
}

export async function startServer(): Promise<void> {
  const services = await createOrchestratorServicesFromConfig();
  await services.templateRegistry.initialize();

  const { server } = createServer(undefined, services);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "server.started", {
    transport: "stdio",
    templatesLoaded: services.templateRegistry.listNames().length,
    roleBoundaryEnforcement: services.config.roleBoundaries?.enforce ?? false,
    tokenOptimization: services.config.tokenOptimization?.enabled ?? false,
  });
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    log("error", "server.failed", { error: message });
    process.exit(1);
  });
}
