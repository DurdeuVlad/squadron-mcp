# Technical Design: Interactive Terminal Sessions

**Sprint 009**  
**Date:** 2026-02-14

---

## System Architecture

### Component Hierarchy

```
delegate_task (tool)
    ↓
TerminalSessionManager (coordinator)
    ↓
InteractiveTerminalSession (per-agent session)
    ↓
WindowsTerminalSpawner (OS-specific)
    ↓
CompletionDetector (response parser)
```

---

## Core Interfaces

### InteractiveTerminalSession

```typescript
export interface InteractiveTerminalSession {
  readonly sessionId: string;
  readonly agent: AgentName;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
  readonly taskCount: number;
  
  // Operations
  sendPrompt(prompt: string, timeoutMs?: number): Promise<SessionResponse>;
  healthCheck(): Promise<boolean>;
  restart(): Promise<void>;
  close(): Promise<void>;
  
  // Events
  on(event: "output", handler: (data: string) => void): void;
  on(event: "error", handler: (error: Error) => void): void;
  on(event: "closed", handler: () => void): void;
}

export type SessionStatus = 
  | "initializing"  // Starting up
  | "ready"         // Idle, can accept prompts
  | "busy"          // Executing a prompt
  | "error"         // Unhealthy, needs restart
  | "closed";       // Terminated

export interface SessionResponse {
  success: boolean;
  output: string;
  durationMs: number;
  completionReason: "marker" | "timeout" | "error";
  error?: string;
}
```

### TerminalSessionManager

```typescript
export interface TerminalSessionManager {
  // Session acquisition
  getOrCreateSession(agent: AgentName): Promise<InteractiveTerminalSession>;
  
  // Execution (convenience method)
  execute(
    agent: AgentName, 
    prompt: string, 
    options?: ExecutionOptions
  ): Promise<AgentExecutionResult>;
  
  // Lifecycle management
  closeSession(sessionId: string): Promise<void>;
  closeAllSessions(): Promise<void>;
  restartSession(sessionId: string): Promise<void>;
  
  // Monitoring
  getSessions(agent?: AgentName): InteractiveTerminalSession[];
  getSessionHealth(sessionId: string): SessionHealth;
  
  // Cleanup
  cleanup(): Promise<void>;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface SessionHealth {
  alive: boolean;
  lastHealthCheck: Date;
  consecutiveFailures: number;
  avgResponseTimeMs: number;
  totalTasks: number;
}
```

### WindowsTerminalSpawner

```typescript
export interface TerminalSpawner {
  spawn(config: SpawnConfig): Promise<SpawnedTerminal>;
  kill(pid: number): Promise<void>;
  isAlive(pid: number): boolean;
}

export interface SpawnConfig {
  command: string;
  args?: string[];
  shell: "cmd" | "powershell";
  visible: boolean;
  cwd?: string;
  env?: Record<string, string>;
  windowOptions?: WindowOptions;
}

export interface WindowOptions {
  title?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface SpawnedTerminal {
  pid: number;
  process: ChildProcess;
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
}
```

### CompletionDetector

```typescript
export interface CompletionDetector {
  detect(
    outputStream: string, 
    strategy: CompletionStrategy
  ): CompletionResult;
}

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
```

---

## Implementation Details

### 1. Windows Terminal Spawning

**Challenge:** Spawn visible terminal window with redirected I/O

**Solution:**
```typescript
// Use cmd.exe with /K flag (keep open after command)
const spawner = spawn("cmd.exe", [
  "/K",           // Keep window open
  command,        // e.g., "claude"
  ...args
], {
  detached: false,  // We want to manage it
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: false,  // Make visible
  cwd: options.cwd,
  env: { ...process.env, ...options.env }
});

// Alternative: PowerShell
const spawner = spawn("powershell.exe", [
  "-NoExit",      // Don't close after command
  "-Command",
  command
], {
  detached: false,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: false
});
```

**Window Title:**
```typescript
// Send to stdin to set title
session.stdin.write(`title ${config.windowTitle}\n`);
```

### 2. Session State Machine

```
[initializing] → spawn terminal → wait for ready marker
       ↓
   [ready] ← task complete ← [busy] ← sendPrompt()
       ↓                        ↓
   healthCheck()            waitForResponse()
       ↓                        ↓
   [error] → restart() → [initializing]
       ↓
   close() → [closed]
```

**State Transitions:**
```typescript
class InteractiveTerminalSessionImpl {
  private status: SessionStatus = "initializing";
  
  private transition(to: SessionStatus, reason?: string): void {
    log("info", "session.transition", {
      sessionId: this.sessionId,
      from: this.status,
      to,
      reason
    });
    
    this.status = to;
    this.emit("statusChange", { from: this.status, to });
  }
  
  async sendPrompt(prompt: string): Promise<SessionResponse> {
    if (this.status !== "ready") {
      throw new Error(`Session not ready: ${this.status}`);
    }
    
    this.transition("busy", "sendPrompt");
    try {
      const response = await this.executePrompt(prompt);
      this.transition("ready", "completed");
      return response;
    } catch (error) {
      this.transition("error", error.message);
      throw error;
    }
  }
}
```

### 3. Completion Detection Strategy

**Problem:** How to know when AI has finished responding?

**Strategies:**

#### A. Marker-Based (Preferred)
```typescript
// Wait for known prompt marker
// Example: Claude shows "> " when ready for next input
const CLAUDE_MARKER = /^> $/m;

function detectCompletion(buffer: string): boolean {
  return CLAUDE_MARKER.test(buffer);
}
```

#### B. Timeout-Based (Fallback)
```typescript
// If no output for N seconds, assume complete
const IDLE_TIMEOUT = 3000; // 3 seconds

let lastOutputTime = Date.now();
stream.on("data", (chunk) => {
  buffer += chunk;
  lastOutputTime = Date.now();
});

const checkInterval = setInterval(() => {
  if (Date.now() - lastOutputTime > IDLE_TIMEOUT) {
    clearInterval(checkInterval);
    resolve(buffer);
  }
}, 500);
```

#### C. Hybrid (Best)
```typescript
async function waitForResponse(
  stream: Readable,
  strategy: CompletionStrategy
): Promise<string> {
  let buffer = "";
  let lastOutputTime = Date.now();
  const maxWait = strategy.timeout ?? 120_000;
  const idleTimeout = 3_000;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Response timeout"));
    }, maxWait);
    
    const checkCompletion = setInterval(() => {
      // Check marker
      if (strategy.marker && buffer.match(strategy.marker)) {
        clearTimeout(timeout);
        clearInterval(checkCompletion);
        resolve(extractContent(buffer, strategy.marker));
        return;
      }
      
      // Check idle timeout
      if (Date.now() - lastOutputTime > idleTimeout) {
        clearTimeout(timeout);
        clearInterval(checkCompletion);
        resolve(buffer);
        return;
      }
      
      // Check error patterns
      if (strategy.errorPatterns) {
        for (const pattern of strategy.errorPatterns) {
          if (buffer.match(pattern)) {
            clearTimeout(timeout);
            clearInterval(checkCompletion);
            reject(new Error(`Error detected: ${pattern}`));
            return;
          }
        }
      }
    }, 100);
    
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      lastOutputTime = Date.now();
    });
    
    stream.on("end", () => {
      clearTimeout(timeout);
      clearInterval(checkCompletion);
      resolve(buffer);
    });
  });
}
```

### 4. Session Pool Management

**Single Session per Agent (MVP):**
```typescript
class TerminalSessionManager {
  private sessions = new Map<AgentName, InteractiveTerminalSession>();
  
  async getOrCreateSession(agent: AgentName): Promise<InteractiveTerminalSession> {
    let session = this.sessions.get(agent);
    
    if (!session || session.status === "closed" || session.status === "error") {
      session = await this.createSession(agent);
      this.sessions.set(agent, session);
    }
    
    return session;
  }
}
```

**Multiple Sessions per Agent (Future):**
```typescript
class TerminalSessionManager {
  private sessionPools = new Map<AgentName, SessionPool>();
  
  async getOrCreateSession(agent: AgentName): Promise<InteractiveTerminalSession> {
    const pool = this.getOrCreatePool(agent);
    
    // Find ready session
    let session = pool.find(s => s.status === "ready");
    
    // Or create new if under limit
    if (!session && pool.length < this.config.maxSessionsPerAgent) {
      session = await this.createSession(agent);
      pool.push(session);
    }
    
    // Or wait for one to become ready
    if (!session) {
      session = await this.waitForReadySession(pool);
    }
    
    return session;
  }
}
```

### 5. Health Monitoring

**Periodic Health Checks:**
```typescript
class TerminalSessionManager {
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [agent, session] of this.sessions) {
        try {
          const healthy = await session.healthCheck();
          if (!healthy) {
            log("warn", "session.unhealthy", { agent });
            await this.restartSession(session.sessionId);
          }
        } catch (error) {
          log("error", "session.healthcheck.failed", { agent, error });
        }
      }
    }, this.config.interactive.healthCheckIntervalMs);
  }
}

class InteractiveTerminalSessionImpl {
  async healthCheck(): Promise<boolean> {
    if (this.status === "closed" || this.status === "error") {
      return false;
    }
    
    // Send no-op command and check for response
    try {
      this.stdin.write("\n");
      // Wait brief moment for prompt marker
      await this.waitForMarker(2000);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 6. Graceful Shutdown

```typescript
class TerminalSessionManager {
  async cleanup(): Promise<void> {
    log("info", "session.cleanup.start", { count: this.sessions.size });
    
    const closePromises = Array.from(this.sessions.values()).map(
      session => session.close().catch(err => 
        log("error", "session.close.failed", { sessionId: session.sessionId, err })
      )
    );
    
    await Promise.allSettled(closePromises);
    this.sessions.clear();
    
    log("info", "session.cleanup.complete");
  }
}

// Register cleanup on process exit
process.on("SIGINT", async () => {
  await sessionManager.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await sessionManager.cleanup();
  process.exit(0);
});
```

---

## Error Handling

### Session Crash Detection

```typescript
class InteractiveTerminalSessionImpl {
  constructor(/* ... */) {
    this.process.on("exit", (code, signal) => {
      log("warn", "session.process.exit", {
        sessionId: this.sessionId,
        code,
        signal
      });
      
      this.transition("closed", `Process exited: ${code ?? signal}`);
      this.emit("closed");
    });
    
    this.process.on("error", (error) => {
      log("error", "session.process.error", {
        sessionId: this.sessionId,
        error
      });
      
      this.transition("error", error.message);
      this.emit("error", error);
    });
  }
}
```

### Retry Logic

```typescript
async function executeWithRetry(
  manager: TerminalSessionManager,
  agent: AgentName,
  prompt: string,
  options: ExecutionOptions
): Promise<AgentExecutionResult> {
  const maxRetries = options.maxRetries ?? 2;
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await manager.execute(agent, prompt, options);
    } catch (error) {
      lastError = error as Error;
      log("warn", "execution.retry", { agent, attempt, error });
      
      if (attempt < maxRetries) {
        // Restart session before retry
        const session = await manager.getOrCreateSession(agent);
        await session.restart();
      }
    }
  }
  
  throw new Error(`Execution failed after ${maxRetries} retries: ${lastError?.message}`);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe("InteractiveTerminalSession", () => {
  it("should spawn visible terminal window", async () => {
    const session = await createSession("claude", mockConfig);
    expect(session.status).toBe("ready");
    expect(mockSpawn).toHaveBeenCalledWith("cmd.exe", ["/K", "claude"]);
  });
  
  it("should send prompt and receive response", async () => {
    const session = await createSession("claude", mockConfig);
    const response = await session.sendPrompt("Hello");
    expect(response.success).toBe(true);
    expect(response.output).toContain("response");
  });
  
  it("should detect completion marker", async () => {
    const detector = new CompletionDetector();
    const result = detector.detect("output\n> ", CLAUDE_STRATEGY);
    expect(result.completed).toBe(true);
    expect(result.reason).toBe("marker");
  });
});
```

### Integration Tests

```typescript
describe("TerminalSessionManager", () => {
  it("should reuse session for multiple tasks", async () => {
    const manager = new TerminalSessionManager(config);
    
    const session1 = await manager.getOrCreateSession("claude");
    await session1.sendPrompt("Task 1");
    
    const session2 = await manager.getOrCreateSession("claude");
    expect(session2).toBe(session1); // Same instance
    
    expect(session1.taskCount).toBe(2);
  });
  
  it("should restart unhealthy session", async () => {
    const manager = new TerminalSessionManager(config);
    const session = await manager.getOrCreateSession("claude");
    
    // Simulate crash
    session.process.kill();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should get new session
    const newSession = await manager.getOrCreateSession("claude");
    expect(newSession.sessionId).not.toBe(session.sessionId);
  });
});
```

### E2E Tests (Manual)

```typescript
// Manual test with real Claude CLI
describe("E2E: Real Claude Session", () => {
  it.skip("should execute task with real Claude CLI", async () => {
    const config = loadConfig();
    config.interactive.enabled = true;
    
    const manager = new TerminalSessionManager(config);
    const result = await manager.execute("claude", "What is 2+2?");
    
    expect(result.status).toBe("completed");
    expect(result.stdout).toContain("4");
    
    await manager.cleanup();
  });
});
```

---

## Performance Considerations

### Session Reuse Benefits

**One-Shot Model:**
- Task 1: 2s startup + 5s execution = 7s
- Task 2: 2s startup + 5s execution = 7s
- Task 3: 2s startup + 5s execution = 7s
- **Total: 21 seconds**

**Interactive Model:**
- Task 1: 2s startup + 5s execution = 7s
- Task 2: 0s startup + 5s execution = 5s (reuse)
- Task 3: 0s startup + 5s execution = 5s (reuse)
- **Total: 17 seconds (19% faster)**

### Resource Usage

**Concern:** Long-running processes may leak memory

**Mitigation:**
- Session max age (restart after 1 hour)
- Idle timeout (close after 5 minutes unused)
- Health monitoring (restart if unresponsive)

---

## Future Enhancements

1. **Cross-Platform Support:** Linux/macOS terminal management using `gnome-terminal`, `xterm`, `Terminal.app`
2. **Window Layout Management:** Tile windows automatically, resize on demand
3. **Session Pools:** Multiple concurrent sessions per agent for parallel execution
4. **Advanced Monitoring:** Memory usage, response time histograms, failure analysis
5. **Hot Reload:** Restart sessions without dropping in-flight tasks
6. **Session Recording:** Record all I/O for replay and debugging

---

## References

- [Node.js child_process](https://nodejs.org/api/child_process.html)
- [Windows CMD.exe documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd)
- [PowerShell -NoExit parameter](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe)

