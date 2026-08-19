# Sprint 009: Interactive Terminal Session Management

**Status:** Planning (2026-02-14)  
**Duration:** 5-7 days  
**Dependencies:** Sprint 008 (subprocess foundation)

---

## Problem Statement

Current subprocess model uses **one-shot CLI invocations**:
- Spawn process → Run command → Wait for exit → Collect output → Process dies
- Example: `claude -p "prompt"` runs once and exits
- Inefficient for multiple tasks (startup overhead every time)
- No visibility for user (hidden background processes)

**User Requirements:**
- **Visible terminal windows** (command prompts users can see)
- **Persistent interactive sessions** (AI CLI tools stay running)
- **Reusable across tasks** (same session handles multiple prompts)
- **Native CLI subscriptions** (claude, gemini commands in interactive mode)

---

## Goal

Transform execution model from **one-shot processes** to **persistent terminal sessions**:

1. Open visible Windows command prompt/PowerShell windows
2. Start interactive AI CLI tools in each window (e.g., `claude`, `gemini`)
3. Keep sessions alive and reusable across multiple tasks
4. Send prompts via stdin and capture responses
5. Manage session lifecycle (open, health check, restart, close)
6. Fall back to one-shot mode if interactive mode unavailable

---

## Architecture Overview

### Current Model (One-Shot)
```
MCP Server
    ↓
delegate_task
    ↓
ProcessAgentRunner.run()
    ↓
spawn("claude", ["-p", "prompt"])
    ↓
Wait for exit → Collect output → Done
```

### New Model (Persistent Sessions)
```
MCP Server
    ↓
delegate_task
    ↓
TerminalSessionManager.execute(task)
    ↓
    ├─ getOrCreateSession("claude")
    │      ↓
    │   [Finds existing session OR opens new terminal window]
    │      ↓
    │   InteractiveTerminalSession
    │      ├─ Windows: start cmd.exe /K claude
    │      ├─ stdin: write prompt
    │      ├─ stdout: stream response
    │      └─ alive: true
    │
    ├─ sendPrompt(task.spec.task)
    │      ↓
    │   Session writes to stdin
    │   Waits for completion marker
    │   Collects response
    │
    └─ Return result (session stays alive)
```

---

## Key Components

### 1. InteractiveTerminalSession (Core)

**Responsibilities:**
- Spawn visible terminal window (Windows `start cmd.exe /K command`)
- Maintain stdin/stdout/stderr pipes
- Track session health (alive, frozen, crashed)
- Send prompts and collect responses
- Detect completion markers (AI-specific patterns)
- Handle session restart on failure

**State:**
```typescript
{
  sessionId: string;
  agent: AgentName;
  process: ChildProcess;
  status: "initializing" | "ready" | "busy" | "error" | "closed";
  createdAt: Date;
  lastUsedAt: Date;
  taskCount: number;
  window: {
    visible: true;
    pid: number;
  };
  health: {
    alive: boolean;
    consecutiveFailures: number;
    lastHealthCheck: Date;
  };
}
```

### 2. TerminalSessionManager (Coordinator)

**Responsibilities:**
- Pool management (one session per agent or multiple)
- Session acquisition (`getOrCreateSession`)
- Load balancing (if multiple sessions per agent)
- Lifecycle management (idle timeout, max age, restart)
- Cleanup on shutdown

**Methods:**
```typescript
interface TerminalSessionManager {
  getOrCreateSession(agent: AgentName): Promise<InteractiveTerminalSession>;
  execute(agent: AgentName, prompt: string): Promise<ExecutionResult>;
  closeSession(sessionId: string): Promise<void>;
  closeAllSessions(): Promise<void>;
  healthCheck(sessionId?: string): Promise<HealthReport>;
  restartSession(sessionId: string): Promise<void>;
}
```

### 3. CompletionDetector (Response Parser)

**Responsibilities:**
- Detect when AI has finished responding
- Handle different AI CLI output patterns
- Timeout detection (no output for N seconds)
- Error detection (crashed, rate limited, etc.)

**Strategies:**
```typescript
interface CompletionStrategy {
  name: string;
  pattern: RegExp | string;  // e.g., claude: /^> $/m
  timeout: number;
  validate(output: string): CompletionResult;
}
```

### 4. WindowManager (Windows-Specific)

**Responsibilities:**
- Launch visible terminal windows on Windows
- Position and style windows (optional)
- Track window PIDs
- Force-close windows on cleanup

**Windows Commands:**
```powershell
# Open visible cmd.exe with claude
start cmd.exe /K "claude"

# Open PowerShell
start powershell.exe -NoExit -Command "gemini"

# Get window position control
[Console]::SetWindowPosition(x, y)
```

---

## Configuration Schema Changes

### Add Interactive Mode Config

```typescript
export const InteractiveSessionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  visibleWindows: z.boolean().default(true),
  maxSessionsPerAgent: z.number().int().positive().default(1),
  sessionIdleTimeoutMs: z.number().int().positive().default(300_000), // 5 min
  sessionMaxAgeMs: z.number().int().positive().default(3_600_000), // 1 hour
  healthCheckIntervalMs: z.number().int().positive().default(30_000),
  completionTimeoutMs: z.number().int().positive().default(120_000),
  maxConsecutiveFailures: z.number().int().positive().default(3),
  
  agents: z.object({
    claude: z.object({
      command: z.string().default("claude"),
      shell: z.enum(["cmd", "powershell"]).default("cmd"),
      startupArgs: z.array(z.string()).default([]),
      completionMarker: z.string().default("> "),
      errorPatterns: z.array(z.string()).default(["rate limit", "error:"]),
    }),
    gemini: z.object({
      command: z.string().default("gemini"),
      shell: z.enum(["cmd", "powershell"]).default("cmd"),
      startupArgs: z.array(z.string()).default([]),
      completionMarker: z.string().default("> "),
      errorPatterns: z.array(z.string()).default(["error:", "failed"]),
    }),
    codex: z.object({
      command: z.string().default("codex"),
      shell: z.enum(["cmd", "powershell"]).default("cmd"),
      startupArgs: z.array(z.string()).default([]),
      completionMarker: z.string().default("codex>"),
      errorPatterns: z.array(z.string()).default(["error:"]),
    }),
  }),
});
```

### Update DelegationRuntime

```typescript
export const DelegationRuntimeSchema = z.object({
  // ... existing fields ...
  executionMode: z.enum(["oneshot", "interactive"]).default("oneshot"),
  interactive: InteractiveSessionConfigSchema.optional(),
});
```

---

## Execution Flow

### Task Execution with Interactive Session

```typescript
// 1. delegate_task receives task
const result = await delegateTask({
  taskId: "task-001",
  executor: "claude",
  executionMode: "subprocess"
});

// 2. TerminalSessionManager handles execution
const session = await sessionManager.getOrCreateSession("claude");
// → Finds existing claude session OR opens new cmd window with `claude`

// 3. Session sends prompt
const prompt = buildExecutorPrompt(task);
await session.sendPrompt(prompt);
// → Writes to session stdin: "TASK: implement feature X\n"

// 4. Session waits for completion
const response = await session.waitForResponse();
// → Monitors stdout for completion marker "> "
// → Collects all output between prompt and marker

// 5. Session stays alive for next task
// → session.lastUsedAt = now
// → session.taskCount++
// → session.status = "ready"

// 6. Return normalized result
return normalizeExecutorReport(response);
```

---

## Fallback Strategy

**Graceful Degradation:**
1. **Try Interactive:** If `interactive.enabled = true`, attempt persistent session
2. **Fallback to One-Shot:** If interactive fails (CLI doesn't support it, window crashes), use existing ProcessAgentRunner
3. **Configurable:** User can force one-shot mode with `executionMode = "oneshot"`

```typescript
async function executeWithFallback(task, agent) {
  if (config.interactive.enabled) {
    try {
      return await sessionManager.execute(agent, task);
    } catch (error) {
      log("warn", "interactive.fallback", { agent, error });
      return await processRunner.run(buildOneShotCommand(task));
    }
  }
  return await processRunner.run(buildOneShotCommand(task));
}
```

---

## Windows-Specific Considerations

### Terminal Window Management

**Spawn Visible Window:**
```typescript
// CMD approach
spawn("cmd.exe", ["/K", "claude"], {
  detached: true,
  stdio: ["pipe", "pipe", "pipe"]
});

// PowerShell approach
spawn("powershell.exe", ["-NoExit", "-Command", "gemini"], {
  detached: true,
  stdio: ["pipe", "pipe", "pipe"]
});
```

**Window Positioning (Optional):**
- Use Windows API via node-ffi-napi or PowerShell commands
- Position windows in tiled layout
- Set window titles for identification

**Cleanup:**
```powershell
# Kill process tree including window
taskkill /PID <pid> /T /F
```

---

## Edge Cases & Error Handling

### 1. Session Crashes
**Detection:** No response to health check ping
**Action:** Mark session dead, create new session, retry task

### 2. Rate Limiting
**Detection:** Error pattern in response (e.g., "rate limit exceeded")
**Action:** Close session, wait, retry with backoff

### 3. Frozen Session
**Detection:** No output for > timeout duration
**Action:** Force restart session

### 4. User Closes Window Manually
**Detection:** Process exit event
**Action:** Remove from session pool, create new on next request

### 5. Concurrent Tasks to Same Agent
**Options:**
- **Queue:** Wait for session to be ready
- **Multi-Session:** Spawn additional sessions (up to maxSessionsPerAgent)
- **Reject:** Return error if busy

### 6. MCP Server Shutdown
**Action:** Close all sessions gracefully, cleanup windows

---

## Success Criteria

- ✅ Open visible Windows terminal windows with AI CLIs
- ✅ Keep sessions alive across multiple tasks (reuse factor > 3)
- ✅ Send prompts via stdin and capture responses correctly
- ✅ Detect completion reliably (no truncated responses)
- ✅ Handle session crashes with automatic restart
- ✅ Fallback to one-shot mode if interactive unavailable
- ✅ Clean shutdown closes all windows
- ✅ Configuration documented with examples
- ✅ Tests cover lifecycle (create, execute, restart, close)

---

## Sprint Tasks

1. **Task 1:** InteractiveTerminalSession implementation
   - Spawn visible Windows terminal
   - Stdin/stdout pipe management
   - Completion detection
   - Health tracking

2. **Task 2:** TerminalSessionManager implementation
   - Session pool management
   - getOrCreateSession logic
   - Lifecycle automation (idle timeout, health checks)

3. **Task 3:** CompletionDetector strategies
   - Claude completion pattern
   - Gemini completion pattern
   - Codex completion pattern
   - Timeout-based fallback

4. **Task 4:** Configuration schema updates
   - InteractiveSessionConfig
   - Update DelegationRuntime
   - Validation and defaults

5. **Task 5:** Integration with delegate_task
   - Detect interactive vs one-shot mode
   - Fallback logic
   - State updates

6. **Task 6:** Testing and documentation
   - Unit tests for session lifecycle
   - Integration tests with mock sessions
   - E2E test with real CLI (manual)
   - User guide for setup

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI CLI doesn't support interactive mode | High | Fallback to one-shot, document requirements |
| Completion detection unreliable | High | Multiple detection strategies, timeout fallback |
| Windows-only implementation | Medium | Document cross-platform as future work |
| Memory leaks from long-running sessions | Medium | Session max age, automatic restarts |
| User confusion with visible windows | Low | Clear documentation, configurable |

---

## Future Enhancements (Post-Sprint)

- **Cross-Platform Support:** Linux/macOS terminal management
- **Window Positioning:** Tiled layout, minimize/restore
- **Session Pools:** Multiple concurrent sessions per agent
- **Advanced Health Checks:** Memory usage, response time monitoring
- **Dashboard Integration:** Live view of active sessions
- **Session Recording:** Log all I/O for debugging

---

## Definition of Done

- [ ] InteractiveTerminalSession class implemented and tested
- [ ] TerminalSessionManager manages session lifecycle
- [ ] Visible Windows terminals open correctly
- [ ] Prompts sent via stdin, responses captured via stdout
- [ ] Completion detection works for at least Claude
- [ ] Fallback to one-shot works when interactive fails
- [ ] Configuration schema updated and validated
- [ ] delegate_task integrates interactive mode
- [ ] Tests pass (unit + integration)
- [ ] Documentation complete (setup + troubleshooting)
- [ ] Manual verification with real Claude CLI

---

## Cross-References

- **Sprint 008:** Subprocess foundation (one-shot model)
- **src/execution/agent-runner.ts:** Current ProcessAgentRunner
- **src/config/types.ts:** Configuration schema
- **src/tools/delegate-task.ts:** Integration point

