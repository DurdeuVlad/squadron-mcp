import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import { collectReportTool } from "./collect-report.js";
import { createAutoOrchestrateTool } from "./auto-orchestrate.js";
import { classifyIntentTool } from "./classify-intent.js";
import { createTaskSpecTool } from "./create-task-spec.js";
import { detectContextTool } from "./detect-context.js";
import { delegateTaskTool } from "./delegate-task.js";
import { extractWorkflowParamsTool } from "./extract-workflow-params.js";
import { optimizeTokensTool } from "./optimize-tokens.js";
import { pingTool } from "./ping.js";
import { reviewOutputTool } from "./review-output.js";
import { trackWorkflowTool } from "./track-workflow.js";
import { toMcpToolDefinition, type ToolDefinition, type WrappedTool } from "./types.js";
import { wrapTool } from "../utils/tool-wrapper.js";
import { TemplateLoader, TemplateRegistry } from "../templates/loader.js";
import { StateManager } from "../state/state-manager.js";
import { FileStorageAdapter } from "../state/file-storage-adapter.js";
import { InMemoryStorageAdapter } from "../state/storage-adapter.js";
import { ConfigLoader } from "../config/loader.js";
import { DEFAULT_CONFIG, type OrchestratorConfig } from "../config/types.js";
import { RoleEnforcer } from "../enforcement/role-enforcer.js";
import { TokenTracker } from "../metrics/token-tracker.js";
import { DEFAULT_QUALITY_GATES, type QualityGate } from "../quality/gates.js";

type AnyWrappedTool = WrappedTool<object>;

export interface OrchestratorServices {
  templateLoader: TemplateLoader;
  templateRegistry: TemplateRegistry;
  stateManager: StateManager;
  configLoader: ConfigLoader;
  config: OrchestratorConfig;
  roleEnforcer: RoleEnforcer;
  tokenTracker: TokenTracker;
  qualityGates: QualityGate[];
}

export class ToolRegistry {
  private readonly tools = new Map<string, AnyWrappedTool>();
  private readonly definitions = new Map<string, Tool>();

  constructor(tools: Array<ToolDefinition<object, object>> = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register<TInput extends object, TOutput extends object>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    const wrapped = wrapTool(tool);
      this.tools.set(tool.name, wrapped as AnyWrappedTool);
    this.definitions.set(tool.name, toMcpToolDefinition(tool));
  }

  listTools(): Tool[] {
    return [...this.definitions.values()];
  }

  async invoke(name: string, input: unknown): Promise<CallToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }

    try {
      const result = await tool.execute(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool invocation failed.";
      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  }
}

export function createOrchestratorServices(
  templatesDir = "templates",
  config: OrchestratorConfig = DEFAULT_CONFIG
): OrchestratorServices {
  const templateLoader = new TemplateLoader(templatesDir);
  const templateRegistry = new TemplateRegistry(templateLoader);
  const stateStorageDir = process.env.SQUADRON_STATE_DIR ?? "state";
  if (config.stateStorage === "sqlite") {
    throw new Error(
      "stateStorage 'sqlite' is not implemented yet. Use 'memory' or 'file'."
    );
  }
  const stateManager = new StateManager(
    config.stateStorage === "file"
      ? new FileStorageAdapter(stateStorageDir)
      : new InMemoryStorageAdapter()
  );
  const configLoader = new ConfigLoader();
  const roleEnforcer = new RoleEnforcer(config);
  const tokenTracker = new TokenTracker(config, stateManager);
  const qualityGates = DEFAULT_QUALITY_GATES;

  return {
    templateLoader,
    templateRegistry,
    stateManager,
    configLoader,
    config,
    roleEnforcer,
    tokenTracker,
    qualityGates,
  };
}

export async function createOrchestratorServicesFromConfig(
  templatesDir = "templates",
  configPath = "squadron-config.json"
): Promise<OrchestratorServices> {
  const configLoader = new ConfigLoader();
  const config = await configLoader.load(configPath);
  const services = createOrchestratorServices(templatesDir, config);
  services.configLoader = configLoader;
  return services;
}

export function createDefaultToolRegistry(services?: OrchestratorServices): ToolRegistry {
  const resolvedServices = services ?? createOrchestratorServices();
  const tools = [
    pingTool as unknown as ToolDefinition<object, object>,
    createTaskSpecTool({
      templateRegistry: resolvedServices.templateRegistry,
      stateManager: resolvedServices.stateManager,
      roleEnforcer: resolvedServices.roleEnforcer,
    }) as unknown as ToolDefinition<object, object>,
    delegateTaskTool({
      stateManager: resolvedServices.stateManager,
      roleEnforcer: resolvedServices.roleEnforcer,
      delegationRuntime: resolvedServices.config.delegationRuntime,
    }) as unknown as ToolDefinition<object, object>,
    collectReportTool({
      stateManager: resolvedServices.stateManager,
      tokenTracker: resolvedServices.tokenTracker,
      qualityGates: resolvedServices.qualityGates,
    }) as unknown as ToolDefinition<object, object>,
    reviewOutputTool({
      stateManager: resolvedServices.stateManager,
    }) as unknown as ToolDefinition<object, object>,
    trackWorkflowTool({
      stateManager: resolvedServices.stateManager,
    }) as unknown as ToolDefinition<object, object>,
    optimizeTokensTool({
      stateManager: resolvedServices.stateManager,
      tokenTracker: resolvedServices.tokenTracker,
      roleEnforcer: resolvedServices.roleEnforcer,
    }) as unknown as ToolDefinition<object, object>,
    classifyIntentTool as unknown as ToolDefinition<object, object>,
    extractWorkflowParamsTool as unknown as ToolDefinition<object, object>,
    detectContextTool as unknown as ToolDefinition<object, object>,
    createAutoOrchestrateTool() as unknown as ToolDefinition<object, object>,
  ];

  return new ToolRegistry(tools);
}
