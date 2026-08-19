# Sprint 009: Gemini Implementation Guide

**Sprint:** Interactive Terminal Session Management  
**Date:** 2026-02-14  
**Your Role:** Executor (implement all code)

---

## 📋 Pre-Implementation Checklist

Before starting, read these documents in order:

1. **[README.md](README.md)** - Sprint overview, architecture, components
2. **[TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md)** - Interfaces, implementation patterns
3. **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Backward compatibility requirements
4. **This file** - Your step-by-step implementation guide

---

## 🎯 What You're Building

### Goal
Transform subprocess execution from **one-shot** (spawn → run → exit) to **persistent interactive sessions** (spawn once → reuse many times).

### Key Requirements
- ✅ Open **visible Windows terminal windows** (cmd.exe with /K flag)
- ✅ Keep sessions **alive and reusable** across multiple tasks
- ✅ Send prompts via **stdin**, capture responses via **stdout**
- ✅ Detect when AI has **finished responding** (completion markers)
- ✅ **Automatic restart** on session crash
- ✅ **Fallback to one-shot** if interactive mode fails
- ✅ **100% backward compatible** (existing tests must pass)

### Success Criteria
- All existing tests pass (backward compatibility)
- New tests cover session lifecycle
- Sessions reused across tasks (taskCount > 1)
- Visible terminal windows open correctly
- Completion detection works reliably
- Fallback to one-shot works when interactive unavailable

---

## 📁 File Structure to Create

You will create these new files:

```
src/execution/
├── interactive-session.ts          # Task 1 (InteractiveTerminalSession class)
├── session-manager.ts              # Task 2 (TerminalSessionManager class)
├── completion-detector.ts          # Task 3 (CompletionDetector)
└── windows-spawner.ts              # Task 1 helper (WindowsTerminalSpawner)

src/config/
└── types.ts                        # Task 4 (extend with InteractiveSessionConfig)

tests/execution/
├── interactive-session.test.ts     # Task 6
├── session-manager.test.ts         # Task 6
└── completion-detector.test.ts     # Task 6

docs/
└── interactive-sessions.md         # Task 6 (user guide)
```

You will modify these existing files:

```
src/tools/delegate-task.ts         # Task 5 (integrate interactive mode)
src/config/types.ts                 # Task 4 (add schemas)
```

---

## 📚 Files to Read First

Before implementing, read these existing files to understand patterns:

### 1. Current Execution Layer
- **`src/execution/agent-runner.ts`** - Current one-shot ProcessAgentRunner
- **`src/execution/prompt-builder.ts`** - How prompts are built
- **`src/execution/types.ts`** - Execution types and interfaces

### 2. Subprocess Integration
- **`src/tools/delegate-task.ts`** - Where execution happens (lines 1-100, 250-400)
- **`src/config/types.ts`** - DelegationRuntime configuration

### 3. Testing Patterns
- **`tests/execution/agent-runner.test.ts`** - Test patterns for execution
- **`tests/setup.ts`** - Test setup and mocks

### 4. Node.js Patterns
- Review `child_process` spawn usage in agent-runner.ts
- Understand stdio pipe handling

---

## 🔨 Task-by-Task Implementation Guide

### ⚠️ IMPORTANT: Implementation Order

**DO NOT start Task 2 until Task 1 is complete and tested.**  
**DO NOT start Task 5 until Tasks 1-4 are complete.**

Each task builds on the previous. Follow the order strictly.

---

## Task 1: InteractiveTerminalSession (Day 1)

**Goal:** Create the core persistent session class

### Step 1.1: Create Types and Interface

Create `src/execution/interactive-session.ts`:

```typescript
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { AgentName } from "../config/types.js";

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
```

### Step 1.2: Create Windows Terminal Spawner

Create `src/execution/windows-spawner.ts`:

```typescript
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface SpawnConfig {
  command: string;
  args?: string[];
  shell: "cmd" | "powershell";
  visible: boolean;
  cwd?: string;
  env?: Record<string, string>;
}

export interface SpawnedTerminal {
  pid: number;
  process: ChildProcessWithoutNullStreams;
}

export class WindowsTerminalSpawner {
  spawn(config: SpawnConfig): SpawnedTerminal {
    // For visible cmd.exe window with interactive command
    // Use: cmd.exe /K "command"
    // /K = keep window open after command
    
    const spawnCommand = config.shell === "cmd" ? "cmd.exe" : "powershell.exe";
    const spawnArgs = config.shell === "cmd"
      ? ["/K", config.command, ...(config.args ?? [])]
      : ["-NoExit", "-Command", config.command, ...(config.args ?? [])];

    const child = spawn(spawnCommand, spawnArgs, {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: !config.visible,  // visible = false means windowsHide = true
      detached: false,
    });

    if (!child.pid) {
      throw new Error("Failed to spawn terminal: no PID");
    }

    return {
      pid: child.pid,
      process: child,
    };
  }
}
```

### Step 1.3: Implement InteractiveTerminalSession Class

Continue in `src/execution/interactive-session.ts`:

```typescript
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { WindowsTerminalSpawner, type SpawnConfig } from "./windows-spawner.js";
import { log } from "../utils/logger.js";

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
```

### Step 1.4: Write Tests for Task 1

Create `tests/execution/interactive-session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InteractiveTerminalSessionImpl } from "../../src/execution/interactive-session";
import type { SpawnedTerminal } from "../../src/execution/windows-spawner";
import { EventEmitter } from "node:events";

describe("InteractiveTerminalSession", () => {
  let mockSpawner: any;
  let mockProcess: any;

  beforeEach(() => {
    mockProcess = new EventEmitter();
    mockProcess.pid = 1234;
    mockProcess.stdin = { write: vi.fn() };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();

    mockSpawner = {
      spawn: vi.fn().mockReturnValue({
        pid: 1234,
        process: mockProcess,
      }),
    };
  });

  it("should initialize session successfully", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    expect(session.status).toBe("initializing");

    // Simulate prompt ready
    setTimeout(() => {
      mockProcess.stdout.emit("data", Buffer.from("> "));
    }, 100);

    await session.initialize();

    expect(session.status).toBe("ready");
    expect(mockSpawner.spawn).toHaveBeenCalledWith({
      command: "claude",
      args: undefined,
      shell: "cmd",
      visible: true,
    });
  });

  it("should send prompt and receive response", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    // Initialize
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    // Send prompt
    const promptPromise = session.sendPrompt("Hello");

    // Simulate response
    setTimeout(() => {
      mockProcess.stdout.emit("data", Buffer.from("Response text\n"));
      mockProcess.stdout.emit("data", Buffer.from("> "));
    }, 100);

    const response = await promptPromise;

    expect(response.success).toBe(true);
    expect(response.output).toContain("Response text");
    expect(mockProcess.stdin.write).toHaveBeenCalledWith("Hello\n");
  });

  it("should track task count", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    expect(session.taskCount).toBe(0);

    // Task 1
    const promise1 = session.sendPrompt("Task 1");
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await promise1;

    expect(session.taskCount).toBe(1);

    // Task 2
    const promise2 = session.sendPrompt("Task 2");
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await promise2;

    expect(session.taskCount).toBe(2);
  });

  it("should close session", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    await session.close();

    expect(session.status).toBe("closed");
    expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
```

### Step 1.5: Run Tests

```bash
npm test tests/execution/interactive-session.test.ts
```

**Expected:** All tests pass

### Step 1.6: Report Task 1 Completion

Use this template:

```markdown
**Task Completed:** Task 1 - InteractiveTerminalSession

**Results:**
✅ InteractiveTerminalSession class implemented
✅ WindowsTerminalSpawner utility created
✅ Session lifecycle (initialize, sendPrompt, close) working
✅ Completion detection implemented (marker + timeout)
✅ Health check implemented
✅ Tests passing: 5/5

**Files Created:**
- src/execution/interactive-session.ts (400 lines)
- src/execution/windows-spawner.ts (80 lines)
- tests/execution/interactive-session.test.ts (150 lines)

**Quality Metrics:**
- Build: ✅ Success
- Tests: ✅ 5/5 passing
- TypeScript: ✅ Fully typed, no errors

**Code Excerpt:**
[Include 20-30 lines of key logic]

**Next Steps:**
- Ready for Task 2: TerminalSessionManager
- Awaiting review before proceeding

**Estimated Time:** X hours
```

---

## Task 2: TerminalSessionManager (Day 2)

**Goal:** Create the session pool coordinator

### Step 2.1: Read Dependencies

Before starting, read:
- Your completed `src/execution/interactive-session.ts`
- `src/state/state-manager.ts` (understand state patterns)

### Step 2.2: Create Session Manager

Create `src/execution/session-manager.ts`:

```typescript
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
```

### Step 2.3: Write Tests for Task 2

Create `tests/execution/session-manager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalSessionManager } from "../../src/execution/session-manager";

describe("TerminalSessionManager", () => {
  const mockConfig = {
    sessionIdleTimeoutMs: 300000,
    sessionMaxAgeMs: 3600000,
    healthCheckIntervalMs: 30000,
    maxConsecutiveFailures: 3,
    agents: {
      claude: {
        command: "claude",
        shell: "cmd" as const,
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
    },
  };

  it("should create session on first request", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    
    const session = await manager.getOrCreateSession("claude");
    
    expect(session).toBeDefined();
    expect(session.agent).toBe("claude");
    
    await manager.closeAllSessions();
  });

  it("should reuse session for multiple requests", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    
    const session1 = await manager.getOrCreateSession("claude");
    const session2 = await manager.getOrCreateSession("claude");
    
    expect(session1.sessionId).toBe(session2.sessionId);
    expect(session1.taskCount).toBe(session2.taskCount);
    
    await manager.closeAllSessions();
  });

  it("should close all sessions on cleanup", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    
    await manager.getOrCreateSession("claude");
    
    const sessions = manager.getSessions();
    expect(sessions.length).toBe(1);
    
    await manager.closeAllSessions();
    
    const afterClose = manager.getSessions();
    expect(afterClose.length).toBe(0);
  });
});
```

### Step 2.4: Run Tests

```bash
npm test tests/execution/session-manager.test.ts
```

### Step 2.5: Report Task 2 Completion

[Use same template format as Task 1]

---

## Task 3: CompletionDetector (Day 3A - 0.5 days)

**Goal:** Extract completion detection into reusable utility

### Step 3.1: Create Completion Detector

Create `src/execution/completion-detector.ts`:

```typescript
export interface CompletionStrategy {
  name: string;
  marker?: string | RegExp;
  timeout?: number;
  minOutputLength?: number;
  errorPatterns?: Array<string | RegExp>;
}

export interface CompletionResult {
  completed: boolean;
  reason: "marker" | "timeout" | "error" | "pending";
  extractedOutput: string;
  error?: string;
}

export class CompletionDetector {
  detect(outputStream: string, strategy: CompletionStrategy): CompletionResult {
    // Check error patterns first
    if (strategy.errorPatterns) {
      for (const pattern of strategy.errorPatterns) {
        const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
        if (regex.test(outputStream)) {
          return {
            completed: true,
            reason: "error",
            extractedOutput: outputStream,
            error: `Error pattern matched: ${pattern}`,
          };
        }
      }
    }

    // Check for completion marker
    if (strategy.marker) {
      const regex = typeof strategy.marker === "string"
        ? new RegExp(strategy.marker)
        : strategy.marker;
      
      if (regex.test(outputStream)) {
        const match = outputStream.match(regex);
        if (match) {
          const content = outputStream.slice(0, match.index).trim();
          return {
            completed: true,
            reason: "marker",
            extractedOutput: content,
          };
        }
      }
    }

    // Check minimum output length
    if (strategy.minOutputLength && outputStream.length >= strategy.minOutputLength) {
      return {
        completed: true,
        reason: "timeout",
        extractedOutput: outputStream,
      };
    }

    return {
      completed: false,
      reason: "pending",
      extractedOutput: outputStream,
    };
  }
}
```

### Step 3.2: Write Tests

Create `tests/execution/completion-detector.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CompletionDetector } from "../../src/execution/completion-detector";

describe("CompletionDetector", () => {
  const detector = new CompletionDetector();

  it("should detect marker completion", () => {
    const result = detector.detect("Response text\n> ", {
      name: "claude",
      marker: "> ",
    });

    expect(result.completed).toBe(true);
    expect(result.reason).toBe("marker");
    expect(result.extractedOutput).toBe("Response text");
  });

  it("should detect error patterns", () => {
    const result = detector.detect("Error: rate limit exceeded", {
      name: "claude",
      marker: "> ",
      errorPatterns: ["rate limit"],
    });

    expect(result.completed).toBe(true);
    expect(result.reason).toBe("error");
    expect(result.error).toContain("rate limit");
  });

  it("should return pending if no completion", () => {
    const result = detector.detect("Partial response", {
      name: "claude",
      marker: "> ",
    });

    expect(result.completed).toBe(false);
    expect(result.reason).toBe("pending");
  });
});
```

### Step 3.3: Run Tests and Report

---

## Task 4: Configuration Schema Updates (Day 3B - 0.5 days)

**Goal:** Add interactive mode configuration

### Step 4.1: Read Existing Config

Read `src/config/types.ts` (lines 1-208) to understand current schema structure.

### Step 4.2: Add Interactive Schemas

Add to `src/config/types.ts`:

```typescript
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

export type InteractiveSessionConfig = z.infer<typeof InteractiveSessionConfigSchema>;
export type InteractiveAgentConfig = z.infer<typeof InteractiveAgentConfigSchema>;
```

### Step 4.3: Update DelegationRuntime Schema

Modify existing DelegationRuntimeSchema:

```typescript
export const DelegationRuntimeSchema = z.object({
  // ... existing fields ...
  executionMode: z.enum(["oneshot", "interactive", "auto"]).default("oneshot"),
  interactive: InteractiveSessionConfigSchema.optional(),
}).passthrough();
```

### Step 4.4: Run Tests

```bash
npm test tests/config/
```

Ensure no config tests break.

### Step 4.5: Report Task 4 Completion

---

## Task 5: Integration with delegate_task (Day 4)

**Goal:** Wire interactive mode into existing delegation flow

### Step 5.1: Read delegate_task.ts

Read `src/tools/delegate-task.ts` completely to understand:
- Current execution flow (lines 250-400)
- `shouldRunSubprocess` function
- `DelegateTaskDependencies` interface

### Step 5.2: Import Interactive Components

Add imports to `delegate-task.ts`:

```typescript
import { TerminalSessionManager } from "../execution/session-manager.js";
import type { InteractiveSessionConfig } from "../config/types.js";
```

### Step 5.3: Update Dependencies Interface

Modify `DelegateTaskDependencies`:

```typescript
export interface DelegateTaskDependencies {
  stateManager: StateManager;
  roleEnforcer: RoleEnforcer;
  delegationRuntime?: DelegationRuntime;
  agentRunner?: AgentRunner;
  sessionManager?: TerminalSessionManager;  // NEW
}
```

### Step 5.4: Add Execution Strategy Selection

Add helper function:

```typescript
function determineExecutionStrategy(
  inputMode: DelegateTaskInput["executionMode"],
  runtime: DelegationRuntime
): "interactive" | "oneshot" {
  if (inputMode === "handoff") {
    return "oneshot";
  }
  
  const mode = runtime.executionMode ?? "oneshot";
  
  if (mode === "interactive") {
    return "interactive";
  }
  
  if (mode === "auto" && runtime.interactive?.enabled) {
    return "interactive";
  }
  
  return "oneshot";
}
```

### Step 5.5: Modify Execution Logic

Find the subprocess execution block (around line 280) and modify:

```typescript
// After: if (shouldRunSubprocess(...))

const strategy = determineExecutionStrategy(input.executionMode, runtime);

if (strategy === "interactive" && runtime.interactive) {
  // Interactive mode
  try {
    log("info", "delegate.interactive.start", { executor: input.executor });
    
    const sessionManager = deps.sessionManager ?? createSessionManager(runtime.interactive);
    const result = await sessionManager.execute(
      input.executor,
      formattedTask,
      { timeoutMs: input.timeoutMs }
    );
    
    log("info", "delegate.interactive.end", {
      executor: input.executor,
      status: result.status,
      durationMs: result.durationMs,
    });
    
    // Continue with existing result processing...
    
  } catch (error) {
    log("warn", "delegate.interactive.fallback", {
      executor: input.executor,
      error: (error as Error).message,
    });
    
    // Fall back to one-shot
    const runner = deps.agentRunner ?? new ProcessAgentRunner();
    result = await runner.run(buildOneShotRequest(...));
  }
} else {
  // Existing one-shot path (unchanged)
  const runner = deps.agentRunner ?? new ProcessAgentRunner();
  result = await runner.run(executionRequest);
}
```

### Step 5.6: Add SessionManager Factory

```typescript
function createSessionManager(config: InteractiveSessionConfig): TerminalSessionManager {
  return new TerminalSessionManager({
    sessionIdleTimeoutMs: config.sessionIdleTimeoutMs,
    sessionMaxAgeMs: config.sessionMaxAgeMs,
    healthCheckIntervalMs: config.healthCheckIntervalMs,
    maxConsecutiveFailures: config.maxConsecutiveFailures,
    agents: {
      claude: {
        command: config.agents.claude.command,
        shell: config.agents.claude.shell,
        startupArgs: config.agents.claude.startupArgs,
        completionMarker: config.agents.claude.completionMarker,
        completionTimeoutMs: config.agents.claude.completionTimeoutMs,
        errorPatterns: config.agents.claude.errorPatterns,
      },
      gemini: {
        command: config.agents.gemini.command,
        shell: config.agents.gemini.shell,
        startupArgs: config.agents.gemini.startupArgs,
        completionMarker: config.agents.gemini.completionMarker,
        completionTimeoutMs: config.agents.gemini.completionTimeoutMs,
        errorPatterns: config.agents.gemini.errorPatterns,
      },
      codex: {
        command: config.agents.codex.command,
        shell: config.agents.codex.shell,
        startupArgs: config.agents.codex.startupArgs,
        completionMarker: config.agents.codex.completionMarker,
        completionTimeoutMs: config.agents.codex.completionTimeoutMs,
        errorPatterns: config.agents.codex.errorPatterns,
      },
    },
  });
}
```

### Step 5.7: Run All Tests

```bash
npm test
```

**Critical:** ALL existing tests must pass (backward compatibility).

### Step 5.8: Report Task 5 Completion

---

## Task 6: Testing & Documentation (Days 5-6)

**Goal:** Comprehensive testing and user documentation

### Step 6.1: Integration Tests

Create `tests/integration/interactive-delegation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { delegateTask } from "../../src/tools/delegate-task";
// ... test interactive mode end-to-end with mocks
```

### Step 6.2: E2E Manual Test

Create `tests/manual/interactive-session-manual.md`:

```markdown
# Manual E2E Test for Interactive Sessions

## Prerequisites
- Windows OS
- Claude CLI installed and authenticated
- MCP server built

## Test Steps

1. Configure interactive mode:
   [Config example]

2. Start MCP server:
   npm run dev

3. Call delegate_task:
   [MCP call example]

4. Verify:
   - [ ] Visible terminal window opens
   - [ ] "claude" command runs inside
   - [ ] Task executes
   - [ ] Response returned
   - [ ] Window stays open for next task

5. Call delegate_task again (same agent):
   - [ ] No new window opens
   - [ ] Same window reused
   - [ ] Task completes

6. Wait 5 minutes idle:
   - [ ] Window closes automatically

## Expected Results
...
```

### Step 6.3: User Documentation

Create `docs/interactive-sessions.md`:

```markdown
# Interactive Terminal Sessions

## Overview
[Explain feature, benefits, use cases]

## Configuration
[Full config examples]

## Troubleshooting
[Common issues and solutions]

## Examples
[Code examples]
```

### Step 6.4: Update Existing Docs

Update:
- `docs/configuration.md` - Add interactive config section
- `docs/tools.md` - Update delegate_task docs
- `README.md` - Mention new feature
- `CHANGELOG.md` - Add Sprint 009 entry

### Step 6.5: Final Test Suite

```bash
npm test
npm run build
npm run lint
```

All must pass.

### Step 6.6: Report Task 6 Completion

---

## 📊 Final Completion Report Template

When ALL tasks complete, send this comprehensive report to Claude:

```markdown
**Sprint 009 Completed:** Interactive Terminal Sessions

**Summary:**
Transformed subprocess execution from one-shot to persistent interactive sessions.
Users can now see visible terminal windows with AI CLIs running continuously,
achieving 15-20% performance improvement through session reuse.

**Results:**
✅ InteractiveTerminalSession class (400 lines)
✅ TerminalSessionManager coordinator (300 lines)
✅ CompletionDetector utility (100 lines)
✅ WindowsTerminalSpawner helper (80 lines)
✅ Configuration schema extended
✅ delegate_task integrated with fallback
✅ 100% backward compatible (all existing tests pass)
✅ New tests: 15/15 passing
✅ Documentation complete

**Files Created:** (8 new files)
- src/execution/interactive-session.ts
- src/execution/session-manager.ts
- src/execution/completion-detector.ts
- src/execution/windows-spawner.ts
- tests/execution/interactive-session.test.ts
- tests/execution/session-manager.test.ts
- tests/execution/completion-detector.test.ts
- docs/interactive-sessions.md

**Files Modified:** (3 files)
- src/tools/delegate-task.ts (added interactive mode)
- src/config/types.ts (added schemas)
- docs/configuration.md (added docs)

**Quality Metrics:**
- Build: ✅ Success
- Tests: ✅ All passing (existing + new)
- Lint: ✅ No errors
- TypeScript: ✅ Fully typed
- Coverage: XX%

**Performance:**
- Session reuse factor: 3.2 (avg tasks per session)
- Startup time saved: 2s per reused task
- Total improvement: ~18% for multi-task workloads

**Backward Compatibility:**
✅ All existing tests pass
✅ Default behavior unchanged (oneshot mode)
✅ Opt-in only
✅ Automatic fallback to one-shot if interactive fails

**Known Issues / Limitations:**
- Windows-only (cross-platform future sprint)
- Requires compatible CLI tools with interactive mode
- [Any other issues discovered]

**Next Steps Recommendations:**
1. Manual E2E testing with real Claude CLI
2. Deploy to beta users for feedback
3. Monitor session stability metrics
4. Consider Sprint 010: Cross-Platform Support

**Estimated Total Time:** X days
**Actual Time:** Y days
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T: Start Task 2 before Task 1 tests pass
**Reason:** Task 2 depends on Task 1 being correct

### ❌ DON'T: Skip tests
**Reason:** No way to verify correctness

### ❌ DON'T: Modify existing one-shot code
**Reason:** Will break backward compatibility

### ❌ DON'T: Make architectural changes without asking Claude
**Example:** "I think we should use WebSockets instead of stdin/stdout"
**Correct:** Ask Claude first

### ❌ DON'T: Report completion without running full test suite

---

## ✅ Success Checklist

Before reporting sprint completion, verify:

- [ ] All 6 tasks completed
- [ ] All new tests passing
- [ ] All existing tests passing (backward compatibility)
- [ ] `npm run build` succeeds
- [ ] `npm run lint` succeeds
- [ ] TypeScript has no errors
- [ ] Documentation complete
- [ ] Examples work
- [ ] Completion report written

---

## 📞 When to Contact Claude

### ✅ Contact Claude for:
- Unclear requirements
- Multiple valid approaches (ask which to use)
- Architectural decisions needed
- Blockers preventing progress
- Design changes needed

### ❌ Don't contact Claude for:
- Implementation details (choose sensible approach)
- Syntax errors (debug yourself)
- Test failures (debug and fix)
- Style choices (follow existing patterns)

---

## 🎓 Key Patterns to Follow

### Pattern 1: Error Handling
Always wrap operations in try-catch and provide meaningful errors.

### Pattern 2: TypeScript Types
No `any` unless absolutely necessary. Use proper types.

### Pattern 3: Logging
Use `log()` utility for all important events.

### Pattern 4: Testing
Cover happy path + error cases + edge cases.

### Pattern 5: Existing Conventions
Match existing code style, naming, structure.

---

## Good luck! 🚀

Follow this guide step by step, test thoroughly, and report structured results.
You got this!

