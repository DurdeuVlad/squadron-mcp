import { z } from "zod";

export const AgentRoleSchema = z.enum(["planner", "executor", "reviewer"]);
export const AgentNameSchema = z.enum(["claude", "gemini", "codex"]);

export const AgentConfigSchema = z
  .object({
    role: AgentRoleSchema,
    capabilities: z.array(z.string()).default([]),
    tokenBudget: z.number().positive().optional(),
    costPerToken: z.number().positive().optional(),
  })
  .passthrough();

export const RoleBoundarySchema = z
  .object({
    enforce: z.boolean().default(true),
    rules: z.array(z.string()).default([]),
    maxPlannerFileLines: z.number().int().positive().default(200),
  })
  .passthrough();

export const TokenOptimizationSchema = z
  .object({
    enabled: z.boolean().default(true),
    savingsTarget: z.number().min(0).max(1).default(0.5),
    reportSavings: z.boolean().default(true),
    alertThreshold: z.number().positive().optional(),
  })
  .passthrough();

export const DelegationAgentCommandSchema = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    env: z.record(z.string()).default({}),
    promptPlaceholder: z.string().default("{prompt}"),
    passPromptViaStdin: z.boolean().default(false),
    successExitCodes: z.array(z.number().int()).default([0]),
  })
  .passthrough();

export const InteractiveAgentConfigSchema = z.object({
  command: z.string().min(1),
  shell: z.enum(["cmd", "powershell"]).default("cmd"),
  startupArgs: z.array(z.string()).default([]),
  completionMarker: z.string().default("> "),
  completionTimeoutMs: z.number().int().positive().default(120_000),
  errorPatterns: z.array(z.string()).default([]),
});

export const InteractiveSessionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  visibleWindows: z.boolean().default(true),
  maxSessionsPerAgent: z.number().int().positive().default(1),
  sessionIdleTimeoutMs: z.number().int().positive().default(300_000),
  sessionMaxAgeMs: z.number().int().positive().default(3_600_000),
  healthCheckIntervalMs: z.number().int().positive().default(30_000),
  maxConsecutiveFailures: z.number().int().positive().default(3),
  agents: z.object({
    claude: InteractiveAgentConfigSchema.default({
      command: "claude",
      shell: "cmd",
      completionMarker: "> ",
      completionTimeoutMs: 120_000,
    }),
    gemini: InteractiveAgentConfigSchema.default({
      command: "gemini",
      shell: "cmd",
      completionMarker: "> ",
      completionTimeoutMs: 120_000,
    }),
    codex: InteractiveAgentConfigSchema.default({
      command: "codex",
      shell: "cmd",
      completionMarker: "codex>",
      completionTimeoutMs: 120_000,
    }),
  }),
});

export const DelegationFallbackSchema = z
  .object({
    claude: z.array(AgentNameSchema).default(["codex"]),
    gemini: z.array(AgentNameSchema).default(["codex"]),
    codex: z.array(AgentNameSchema).default([]),
  })
  .passthrough();

export const DelegationRuntimeSchema = z
  .object({
    enabled: z.boolean().default(false),
    executionMode: z.enum(["oneshot", "interactive", "auto"]).default("oneshot"),
    interactive: InteractiveSessionConfigSchema.optional(),
    defaultTimeoutMs: z.number().int().positive().default(120_000),
    maxOutputBytes: z.number().int().positive().default(131_072),
    fallbackOnFailure: z.boolean().default(true),
    fallbackExecutors: DelegationFallbackSchema.default({
      claude: ["codex"],
      gemini: ["codex"],
      codex: [],
    }),
    agents: z
      .object({
        claude: DelegationAgentCommandSchema.default({
          command: "claude",
          args: ["-p", "{prompt}", "--output-format", "json"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        }),
        gemini: DelegationAgentCommandSchema.default({
          command: "gemini",
          args: ["-p", "{prompt}", "--output-format", "json"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        }),
        codex: DelegationAgentCommandSchema.default({
          command: "codex",
          args: ["exec", "{prompt}", "--skip-git-repo-check"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        }),
      })
      .default({
        claude: {
          command: "claude",
          args: ["-p", "{prompt}", "--output-format", "json"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        },
        gemini: {
          command: "gemini",
          args: ["-p", "{prompt}", "--output-format", "json"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        },
        codex: {
          command: "codex",
          args: ["exec", "{prompt}", "--skip-git-repo-check"],
          passPromptViaStdin: false,
          promptPlaceholder: "{prompt}",
          successExitCodes: [0],
        },
      }),
  })
  .passthrough();

export const OrchestratorConfigSchema = z
  .object({
    agents: z.record(AgentConfigSchema),
    templates: z.record(z.string()).optional(),
    roleBoundaries: RoleBoundarySchema.optional(),
    tokenOptimization: TokenOptimizationSchema.optional(),
    delegationRuntime: DelegationRuntimeSchema.optional(),
    stateStorage: z.enum(["memory", "file", "sqlite"]).default("memory"),
    plugins: z.array(z.string()).default([]),
  })
  .passthrough();

export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentName = z.infer<typeof AgentNameSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type RoleBoundary = z.infer<typeof RoleBoundarySchema>;
export type TokenOptimization = z.infer<typeof TokenOptimizationSchema>;
export type DelegationAgentCommand = z.infer<typeof DelegationAgentCommandSchema>;
export type DelegationFallback = z.infer<typeof DelegationFallbackSchema>;
export type DelegationRuntime = z.infer<typeof DelegationRuntimeSchema>;
export type InteractiveSessionConfig = z.infer<typeof InteractiveSessionConfigSchema>;
export type InteractiveAgentConfig = z.infer<typeof InteractiveAgentConfigSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;

export const DEFAULT_CONFIG: OrchestratorConfig = {
  agents: {
    claude: {
      role: "planner",
      capabilities: ["planning", "review", "strategy", "orchestration"],
      tokenBudget: 100_000,
      costPerToken: 0.000015,
    },
    gemini: {
      role: "executor",
      capabilities: ["execution", "code-reading", "validation", "reporting"],
      tokenBudget: 1_000_000,
      costPerToken: 0.0000025,
    },
    codex: {
      role: "reviewer",
      capabilities: ["planning", "execution", "review", "validation"],
      tokenBudget: 500_000,
      costPerToken: 0.00002,
    },
  },
  roleBoundaries: {
    enforce: true,
    rules: [
      "planner may not read code files >200 lines",
      "executor may not make architectural decisions",
    ],
    maxPlannerFileLines: 200,
  },
  tokenOptimization: {
    enabled: true,
    savingsTarget: 0.5,
    reportSavings: true,
    alertThreshold: 1_000,
  },
  delegationRuntime: {
    enabled: false,
    executionMode: "oneshot",
    defaultTimeoutMs: 120_000,
    maxOutputBytes: 131_072,
    fallbackOnFailure: true,
    fallbackExecutors: {
      claude: ["codex"],
      gemini: ["codex"],
      codex: [],
    },
    agents: {
      claude: {
        command: "claude",
        args: ["-p", "{prompt}", "--output-format", "json"],
        env: {},
        passPromptViaStdin: false,
        promptPlaceholder: "{prompt}",
        successExitCodes: [0],
      },
      gemini: {
        command: "gemini",
        args: ["-p", "{prompt}", "--output-format", "json"],
        env: {},
        passPromptViaStdin: false,
        promptPlaceholder: "{prompt}",
        successExitCodes: [0],
      },
      codex: {
        command: "codex",
        args: ["exec", "{prompt}", "--skip-git-repo-check"],
        env: {},
        passPromptViaStdin: false,
        promptPlaceholder: "{prompt}",
        successExitCodes: [0],
      },
    },
  },
  stateStorage: "memory",
  plugins: [],
};
