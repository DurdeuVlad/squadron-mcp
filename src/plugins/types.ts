import type { PromptRegistry } from "../prompts/registry.js";
import type { TemplateRegistry } from "../templates/loader.js";
import type { OrchestratorServices, ToolRegistry } from "../tools/registry.js";

export interface SquadronPlugin {
  name: string;
  version?: string;
  registerTools?(registry: ToolRegistry, services: OrchestratorServices): void | Promise<void>;
  registerPrompts?(registry: PromptRegistry, services: OrchestratorServices): void | Promise<void>;
  registerTemplates?(
    templateRegistry: TemplateRegistry,
    services: OrchestratorServices
  ): void | Promise<void>;
}

export function isSquadronPlugin(value: unknown): value is SquadronPlugin {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { name?: unknown }).name === "string" &&
    (value as { name: string }).name.length > 0
  );
}
