import { readFile } from "node:fs/promises";

import {
  DEFAULT_CONFIG,
  OrchestratorConfigSchema,
  type OrchestratorConfig,
} from "./types.js";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function mergeWithDefaults(config: DeepPartial<OrchestratorConfig>): OrchestratorConfig {
  return OrchestratorConfigSchema.parse({
    ...DEFAULT_CONFIG,
    ...config,
    agents: {
      ...DEFAULT_CONFIG.agents,
      ...(config.agents ?? {}),
    },
    templates: {
      ...(DEFAULT_CONFIG.templates ?? {}),
      ...(config.templates ?? {}),
    },
    roleBoundaries: {
      ...DEFAULT_CONFIG.roleBoundaries,
      ...(config.roleBoundaries ?? {}),
    },
    tokenOptimization: {
      ...DEFAULT_CONFIG.tokenOptimization,
      ...(config.tokenOptimization ?? {}),
    },
    delegationRuntime: {
      ...DEFAULT_CONFIG.delegationRuntime,
      ...(config.delegationRuntime ?? {}),
      fallbackExecutors: {
        ...DEFAULT_CONFIG.delegationRuntime?.fallbackExecutors,
        ...(config.delegationRuntime?.fallbackExecutors ?? {}),
      },
      agents: {
        ...DEFAULT_CONFIG.delegationRuntime?.agents,
        ...(config.delegationRuntime?.agents ?? {}),
      },
    },
  });
}

export class ConfigLoader {
  async load(configPath = "squadron-config.json"): Promise<OrchestratorConfig> {
    try {
      const content = await readFile(configPath, "utf8");
      const parsed = JSON.parse(content) as unknown;
      const validated = OrchestratorConfigSchema.parse(parsed);
      return mergeWithDefaults(validated);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
}

export { mergeWithDefaults };
