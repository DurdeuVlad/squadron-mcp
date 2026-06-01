import type { AgentName, DelegationAgentCommand } from "../config/types.js";

export type ExecutionStatus = "completed" | "failed" | "timed_out";

export interface RunnerCommand {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
  successExitCodes: number[];
}

export interface AgentExecutionRequest {
  agent: AgentName;
  command: RunnerCommand;
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface AgentExecutionResult {
  agent: AgentName;
  status: ExecutionStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface AgentRunner {
  run(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}

export interface NormalizedExecutorReport {
  summary: string;
  outputs: string[];
  issues: string[];
  recommendations: string[];
  metrics: {
    tokenUsage?: number;
    tokensUsed?: number;
    durationSeconds?: number;
    testsPassed?: number;
    testsTotal?: number;
    buildSuccess?: boolean;
  };
  rawOutput: string;
  parser: "json" | "fenced-json" | "embedded-json" | "plain-text";
}

export interface PromptBuildInput {
  taskName: string;
  formattedTask: string;
}

export interface PromptBuildResult {
  prompt: string;
}

export interface BuiltCommand {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
  successExitCodes: number[];
}

export type CommandConfigInput = DelegationAgentCommand;
