import type { PromptRegistry } from "../prompts/registry.js";
import type { TemplateRegistry } from "../templates/loader.js";
import type { OrchestratorServices, ToolRegistry } from "../tools/registry.js";
import { log } from "../utils/logger.js";
import type { LoadedPlugin } from "./loader.js";

export interface PluginTargets {
  toolRegistry: ToolRegistry;
  promptRegistry: PromptRegistry;
  templateRegistry: TemplateRegistry;
}

/**
 * Applies each loaded plugin's hooks to the running registries. Each hook
 * call is isolated in its own try/catch: a plugin whose registerPrompts
 * throws shouldn't undo its already-succeeded registerTools, and one
 * plugin's failure must never block other plugins from loading.
 */
export async function applyPlugins(
  plugins: LoadedPlugin[],
  targets: PluginTargets,
  services: OrchestratorServices
): Promise<void> {
  for (const { plugin, path } of plugins) {
    if (plugin.registerTools) {
      try {
        await plugin.registerTools(targets.toolRegistry, services);
      } catch (error) {
        logHookFailure(plugin.name, path, "registerTools", error);
      }
    }

    if (plugin.registerPrompts) {
      try {
        await plugin.registerPrompts(targets.promptRegistry, services);
      } catch (error) {
        logHookFailure(plugin.name, path, "registerPrompts", error);
      }
    }

    if (plugin.registerTemplates) {
      try {
        await plugin.registerTemplates(targets.templateRegistry, services);
      } catch (error) {
        logHookFailure(plugin.name, path, "registerTemplates", error);
      }
    }
  }
}

function logHookFailure(pluginName: string, path: string, hook: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown plugin hook error.";
  log("error", "plugin.hook_failed", { plugin: pluginName, path, hook, error: message });
}
