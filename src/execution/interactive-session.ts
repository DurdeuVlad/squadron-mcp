import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { AgentName } from "../config/types.js";
import { WindowsTerminalSpawner, type SpawnedTerminal } from "./windows-spawner.js";
import { log } from "../utils/logger.js";

export type SessionStatus =
  | "initializing"
  | "ready"
  | "busy"
  | "error"
  | "closed";

export interface SessionResponse {
  success: boolean;
  output: string;
  durationMs: number;
  completionReason: "marker" | "timeout" | "error";
  error?: string;
}

export interface InteractiveTerminalSession {
  readonly sessionId: string;
  readonly agent: AgentName;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
  readonly taskCount: number;

  sendPrompt(prompt: string, timeoutMs?: number): Promise<SessionResponse>;
  healthCheck(): Promise<boolean>;
  restart(): Promise<void>;
  close(): Promise<void>;
}

export interface SessionConfig {
  agent: AgentName;
  command: string;
  args?: string[];
  shell: "cmd" | "powershell";
  completionMarker: string;
  completionTimeoutMs: number;
  errorPatterns?: string[];
}

export class InteractiveTerminalSessionImpl
  extends EventEmitter
  implements InteractiveTerminalSession
{
  readonly sessionId: string;
  readonly agent: AgentName;
  readonly createdAt: Date;

  private spawner: WindowsTerminalSpawner;
  private config: SessionConfig;
  private currentStatus: SessionStatus = "initializing";
  private spawnedTerminal: SpawnedTerminal | null = null;
  private outputBuffer: string = "";
  private _lastUsedAt: Date;
  private _taskCount: number = 0;

  constructor(config: SessionConfig, spawner?: WindowsTerminalSpawner) {
    super();
    this.sessionId = randomUUID();
    this.agent = config.agent;
    this.createdAt = new Date();
    this._lastUsedAt = this.createdAt;
    this.config = config;
    this.spawner = spawner ?? new WindowsTerminalSpawner();
  }

  get status(): SessionStatus {
    return this.currentStatus;
  }

  get lastUsedAt(): Date {
    return this._lastUsedAt;
  }

  get taskCount(): number {
    return this._taskCount;
  }

  async initialize(): Promise<void> {
    log("info", "session.initialize", { sessionId: this.sessionId, agent: this.agent });

    try {
      this.spawnedTerminal = this.spawner.spawn({
        command: this.config.command,
        args: this.config.args,
        shell: this.config.shell,
        visible: true,
      });

      this.setupEventHandlers();
      this.transition("ready", "initialized");
      
      // Wait brief moment for terminal to be ready
      await this.waitForPrompt(5000);
    } catch (error) {
      this.transition("error", (error as Error).message);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.spawnedTerminal) return;

    const { process: child } = this.spawnedTerminal;

    child.stdout.on("data", (chunk: Buffer) => {
      this.outputBuffer += chunk.toString();
      this.emit("output", chunk.toString());
    });

    child.stderr.on("data", (chunk: Buffer) => {
      log("warn", "session.stderr", {
        sessionId: this.sessionId,
        data: chunk.toString(),
      });
    });

    child.on("exit", (code, signal) => {
      log("warn", "session.exit", {
        sessionId: this.sessionId,
        code,
        signal,
      });
      this.transition("closed", `Process exited: ${code ?? signal}`);
      this.emit("closed");
    });

    child.on("error", (error) => {
      log("error", "session.error", {
        sessionId: this.sessionId,
        error: error.message,
      });
      this.transition("error", error.message);
      this.emit("error", error);
    });
  }

  async sendPrompt(prompt: string, timeoutMs?: number): Promise<SessionResponse> {
    if (this.currentStatus !== "ready") {
      throw new Error(`Session not ready: ${this.currentStatus}`);
    }

    this.transition("busy", "sendPrompt");
    this._taskCount++;
    this._lastUsedAt = new Date();
    const started = Date.now();

    try {
      // Clear buffer before sending prompt
      this.outputBuffer = "";

      // Write prompt to stdin
      if (!this.spawnedTerminal) {
        throw new Error("Terminal not spawned");
      }
      this.spawnedTerminal.process.stdin.write(prompt + "\n");

      // Wait for response
      const output = await this.waitForResponse(
        timeoutMs ?? this.config.completionTimeoutMs
      );

      this.transition("ready", "completed");
      
      return {
        success: true,
        output,
        durationMs: Date.now() - started,
        completionReason: "marker",
      };
    } catch (error) {
      this.transition("error", (error as Error).message);
      return {
        success: false,
        output: this.outputBuffer,
        durationMs: Date.now() - started,
        completionReason: "error",
        error: (error as Error).message,
      };
    }
  }

  private async waitForResponse(timeoutMs: number): Promise<string> {
    const maxWait = timeoutMs;
    const idleTimeout = 3000; // 3 seconds no output = done
    let lastOutputTime = Date.now();

    return new Promise((resolve, reject) => {
      const absoluteTimeout = setTimeout(() => {
        this.off("output", outputHandler);
        reject(new Error("Response timeout"));
      }, maxWait);

      const outputHandler = () => {
        lastOutputTime = Date.now();
      };

      this.on("output", outputHandler);

      const checkCompletion = setInterval(() => {
        // Check for completion marker
        if (this.outputBuffer.includes(this.config.completionMarker)) {
          clearTimeout(absoluteTimeout);
          clearInterval(checkCompletion);
          this.off("output", outputHandler);
          
          // Extract content before marker
          const content = this.extractContent(this.outputBuffer);
          resolve(content);
          return;
        }

        // Check for error patterns
        if (this.config.errorPatterns) {
          for (const pattern of this.config.errorPatterns) {
            if (this.outputBuffer.includes(pattern)) {
              clearTimeout(absoluteTimeout);
              clearInterval(checkCompletion);
              this.off("output", outputHandler);
              reject(new Error(`Error detected: ${pattern}`));
              return;
            }
          }
        }

        // Check idle timeout
        if (Date.now() - lastOutputTime > idleTimeout) {
          clearTimeout(absoluteTimeout);
          clearInterval(checkCompletion);
          this.off("output", outputHandler);
          resolve(this.outputBuffer);
        }
      }, 100);
    });
  }

  private async waitForPrompt(timeoutMs: number): Promise<void> {
    // Wait for initial prompt marker
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for prompt"));
      }, timeoutMs);

      const check = setInterval(() => {
        if (this.outputBuffer.includes(this.config.completionMarker)) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  private extractContent(buffer: string): string {
    const markerIndex = buffer.indexOf(this.config.completionMarker);
    if (markerIndex === -1) {
      return buffer;
    }
    return buffer.slice(0, markerIndex).trim();
  }

  async healthCheck(): Promise<boolean> {
    if (this.currentStatus === "closed" || this.currentStatus === "error") {
      return false;
    }

    if (!this.spawnedTerminal) {
      return false;
    }

    try {
      // Send newline and check for prompt
      this.spawnedTerminal.process.stdin.write("\n");
      await this.waitForPrompt(2000);
      return true;
    } catch {
      return false;
    }
  }

  async restart(): Promise<void> {
    log("info", "session.restart", { sessionId: this.sessionId });
    await this.close();
    await this.initialize();
  }

  async close(): Promise<void> {
    if (this.currentStatus === "closed") {
      return;
    }

    log("info", "session.close", { sessionId: this.sessionId });

    if (this.spawnedTerminal) {
      this.spawnedTerminal.process.kill("SIGTERM");
      this.spawnedTerminal = null;
    }

    this.transition("closed", "manual close");
  }

  private transition(to: SessionStatus, reason?: string): void {
    log("info", "session.transition", {
      sessionId: this.sessionId,
      from: this.currentStatus,
      to,
      reason,
    });

    this.currentStatus = to;
    this.emit("statusChange", { from: this.currentStatus, to });
  }
}
