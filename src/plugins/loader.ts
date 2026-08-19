import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { log } from "../utils/logger.js";
import { isSquadronPlugin, type SquadronPlugin } from "./types.js";

export interface LoadedPlugin {
  plugin: SquadronPlugin;
  path: string;
}

/**
 * Loads plugins from local file paths only (v1 scope - no npm-package
 * resolution, no marketplace). A plugin that fails to import or doesn't
 * export a valid SquadronPlugin is skipped with a logged warning - it
 * must never crash server startup, since one bad plugin shouldn't take
 * down the whole server. Logging goes through `log()`, which always
 * writes to stderr - stdout is the MCP transport channel and must stay
 * clean of anything but protocol messages.
 */
export async function loadPlugins(pluginPaths: string[], baseDir: string): Promise<LoadedPlugin[]> {
  const loaded: LoadedPlugin[] = [];

  for (const rawPath of pluginPaths) {
    const resolvedPath = resolve(baseDir, rawPath);

    try {
      const imported = (await import(pathToFileURL(resolvedPath).href)) as {
        default?: unknown;
        plugin?: unknown;
      };
      const candidate = imported.default ?? imported.plugin;

      if (!isSquadronPlugin(candidate)) {
        log("error", "plugin.invalid", {
          path: resolvedPath,
          reason: "Module must export a default or named 'plugin' with at least a non-empty string 'name'.",
        });
        continue;
      }

      loaded.push({ plugin: candidate, path: resolvedPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error loading plugin.";
      log("error", "plugin.load_failed", { path: resolvedPath, error: message });
    }
  }

  return loaded;
}
