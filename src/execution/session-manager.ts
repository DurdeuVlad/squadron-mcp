import type { AgentName } from "../config/types.js";
import type {
  InteractiveTerminalSession,
  SessionConfig,
} from "./interactive-session.js";
import { InteractiveTerminalSessionImpl } from "./interactive-session.js";
import type { AgentExecutionResult, ExecutionStatus } from "./types.js";
import { log } from "../utils/logger.js";

export interface SessionManagerConfig {
  sessionIdleTimeoutMs: number;
  sessionMaxAgeMs: number;
  healthCheckIntervalMs: number;
  maxConsecutiveFailures: number;
  agents: Record<
    AgentName,
    {
      command: string;
      shell: "cmd" | "powershell";
      startupArgs?: string[];
      completionMarker: string;
      completionTimeoutMs: number;
      errorPatterns?: string[];
    }
  >;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export class TerminalSessionManager {
  private sessions = new Map<AgentName, InteractiveTerminalSession>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: SessionManagerConfig;

  constructor(config: SessionManagerConfig) {
    this.config = config;
    this.startHealthChecks();
  }

  async getOrCreateSession(
    agent: AgentName
  ): Promise<InteractiveTerminalSession> {
    let session = this.sessions.get(agent);

    // Create new session if none exists or current is unhealthy
    if (
      !session ||
      session.status === "closed" ||
      session.status === "error"
    ) {
      log("info", "session.create", { agent });
      session = await this.createSession(agent);
      this.sessions.set(agent, session);
    }

    // Check if session is too old
    const age = Date.now() - session.createdAt.getTime();
    if (age > this.config.sessionMaxAgeMs) {
      log("info", "session.max_age", { agent, ageMs: age });
      await session.restart();
    }

    // Check if session is idle too long
    const idle = Date.now() - session.lastUsedAt.getTime();
    if (idle > this.config.sessionIdleTimeoutMs) {
      log("info", "session.idle_timeout", { agent, idleMs: idle });
      await session.close();
      this.sessions.delete(agent);
      session = await this.createSession(agent);
      this.sessions.set(agent, session);
    }

    return session;
  }

  async execute(
    agent: AgentName,
    prompt: string,
    options?: ExecutionOptions
  ): Promise<AgentExecutionResult> {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();

    try {
      const session = await this.getOrCreateSession(agent);
      const response = await session.sendPrompt(
        prompt,
        options?.timeoutMs ?? this.config.agents[agent].completionTimeoutMs
      );

      const ended = Date.now();

      if (!response.success) {
        return {
          agent,
          status: "failed" as ExecutionStatus,
          exitCode: null,
          signal: null,
          startedAt,
          endedAt: new Date(ended).toISOString(),
          durationMs: ended - started,
          stdout: response.output,
          stderr: "",
          error: response.error,
        };
      }

      return {
        agent,
        status: "completed" as ExecutionStatus,
        exitCode: 0,
        signal: null,
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        stdout: response.output,
        stderr: "",
      };
    } catch (error) {
      const ended = Date.now();
      return {
        agent,
        status: "failed" as ExecutionStatus,
        exitCode: null,
        signal: null,
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        stdout: "",
        stderr: "",
        error: (error as Error).message,
      };
    }
  }

  private async createSession(
    agent: AgentName
  ): Promise<InteractiveTerminalSession> {
    const agentConfig = this.config.agents[agent];
    if (!agentConfig) {
      throw new Error(`No configuration for agent: ${agent}`);
    }

    const sessionConfig: SessionConfig = {
      agent,
      command: agentConfig.command,
      args: agentConfig.startupArgs,
      shell: agentConfig.shell,
      completionMarker: agentConfig.completionMarker,
      completionTimeoutMs: agentConfig.completionTimeoutMs,
      errorPatterns: agentConfig.errorPatterns,
    };

    const session = new InteractiveTerminalSessionImpl(sessionConfig);
    await session.initialize();

    // Set up event handlers
    session.on("closed", () => {
      log("info", "session.closed.event", { agent });
      this.sessions.delete(agent);
    });

    session.on("error", (error: Error) => {
      log("error", "session.error.event", { agent, error: error.message });
    });

    return session;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [agent, session] of this.sessions) {
        try {
          const healthy = await session.healthCheck();
          if (!healthy) {
            log("warn", "session.unhealthy", { agent });
            await session.restart();
          }
        } catch (error) {
          log("error", "session.healthcheck.failed", {
            agent,
            error: (error as Error).message,
          });
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  async closeSession(agent: AgentName): Promise<void> {
    const session = this.sessions.get(agent);
    if (session) {
      await session.close();
      this.sessions.delete(agent);
    }
  }

  async closeAllSessions(): Promise<void> {
    log("info", "session.cleanup.start", { count: this.sessions.size });

    const closePromises = Array.from(this.sessions.values()).map((session) =>
      session.close().catch((err) =>
        log("error", "session.close.failed", {
          sessionId: session.sessionId,
          err,
        })
      )
    );

    await Promise.allSettled(closePromises);
    this.sessions.clear();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    log("info", "session.cleanup.complete");
  }

  getSessions(agent?: AgentName): InteractiveTerminalSession[] {
    if (agent) {
      const session = this.sessions.get(agent);
      return session ? [session] : [];
    }
    return Array.from(this.sessions.values());
  }
}
