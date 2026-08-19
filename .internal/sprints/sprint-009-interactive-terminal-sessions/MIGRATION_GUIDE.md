# Migration Guide: One-Shot to Interactive Sessions

**Sprint 009**  
**Date:** 2026-02-14

---

## Overview

This document outlines how to migrate from the current **one-shot subprocess model** to the new **interactive terminal session model** while maintaining backward compatibility.

---

## Current vs. New Architecture

### Current (Sprint 008): One-Shot Model

```typescript
// User config
{
  "delegationRuntime": {
    "enabled": true,
    "agents": {
      "claude": {
        "command": "claude",
        "args": ["-p", "{prompt}"]
      }
    }
  }
}

// Execution
delegate_task({ taskId: "..." })
  → ProcessAgentRunner.run()
  → spawn("claude", ["-p", "prompt"])
  → wait for exit
  → collect output
  → process terminates
```

**Characteristics:**
- ✅ Simple, stateless
- ✅ Process isolation
- ❌ Startup overhead every task
- ❌ No visibility (hidden processes)
- ❌ Can't reuse sessions

### New (Sprint 009): Interactive Model

```typescript
// User config
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "interactive",  // NEW
    "interactive": {                 // NEW
      "enabled": true,
      "visibleWindows": true,
      "agents": {
        "claude": {
          "command": "claude",
          "shell": "cmd",
          "completionMarker": "> "
        }
      }
    }
  }
}

// Execution
delegate_task({ taskId: "..." })
  → TerminalSessionManager.execute()
  → getOrCreateSession("claude")
      → if new: spawn visible terminal with "claude"
      → if exists: reuse
  → sendPrompt(task)
  → waitForResponse()
  → session stays alive
```

**Characteristics:**
- ✅ Reusable sessions (faster)
- ✅ Visible terminals (user can see)
- ✅ Interactive mode support
- ❌ More complex state management
- ❌ Requires compatible CLI tools

---

## Backward Compatibility Strategy

### Principle: Graceful Degradation

**New users:** Can opt-in to interactive mode  
**Existing users:** Continue using one-shot mode (default)  
**Fallback:** If interactive fails, automatically fall back to one-shot

### Implementation

```typescript
// In delegate_task.ts
async function executeTask(task, executor, config) {
  // Determine execution strategy
  const strategy = determineExecutionStrategy(config);
  
  if (strategy === "interactive") {
    try {
      return await interactiveExecutionLayer.execute(task, executor);
    } catch (error) {
      log("warn", "interactive.fallback", { error });
      // Fall back to one-shot
      return await oneShotExecutionLayer.execute(task, executor);
    }
  } else {
    // Use existing one-shot implementation
    return await oneShotExecutionLayer.execute(task, executor);
  }
}

function determineExecutionStrategy(config): "interactive" | "oneshot" {
  // Explicit mode set
  if (config.delegationRuntime?.executionMode) {
    return config.delegationRuntime.executionMode;
  }
  
  // Auto-detect: use interactive if enabled
  if (config.delegationRuntime?.interactive?.enabled) {
    return "interactive";
  }
  
  // Default: one-shot
  return "oneshot";
}
```

---

## Migration Phases

### Phase 1: Implementation (Days 1-4)

**Goal:** Build interactive components without breaking existing functionality

**Tasks:**
1. Create `InteractiveTerminalSession` class
2. Create `TerminalSessionManager` class
3. Create `WindowsTerminalSpawner` utility
4. Create `CompletionDetector` utility
5. Add configuration schema for interactive mode

**Testing:**
- Unit tests for new components
- No changes to existing delegate_task flow yet

**Result:** New code exists but isn't used yet

---

### Phase 2: Integration (Days 5-6)

**Goal:** Integrate interactive mode into delegate_task with fallback

**Tasks:**
1. Update `delegate_task.ts` to support execution strategy selection
2. Create execution layer abstraction
3. Implement fallback logic (interactive → one-shot)
4. Add mode detection in `shouldRunSubprocess`

**Changes to existing code:**
```typescript
// Before (Sprint 008)
if (shouldRunSubprocess(input.executionMode, runtime)) {
  const runner = agentRunner ?? new ProcessAgentRunner();
  result = await runner.run(executionRequest);
}

// After (Sprint 009)
if (shouldRunSubprocess(input.executionMode, runtime)) {
  const strategy = determineExecutionStrategy(runtime);
  
  if (strategy === "interactive") {
    const sessionManager = getSessionManager(runtime);
    result = await sessionManager.execute(
      input.executor, 
      formattedTask,
      { timeoutMs: input.timeoutMs }
    );
  } else {
    // Existing one-shot path (unchanged)
    const runner = agentRunner ?? new ProcessAgentRunner();
    result = await runner.run(executionRequest);
  }
}
```

**Testing:**
- Integration tests with both modes
- Fallback tests (simulate interactive failure)
- Existing tests still pass

**Result:** Users can opt-in to interactive mode via config

---

### Phase 3: Documentation & Rollout (Day 7)

**Goal:** Document new feature and guide users

**Tasks:**
1. Update `docs/configuration.md` with interactive mode settings
2. Create `docs/interactive-sessions.md` usage guide
3. Add examples to `examples/`
4. Update `README.md` with feature announcement
5. Create troubleshooting guide

**Result:** Users can confidently enable interactive mode

---

## Configuration Migration

### Minimal Config (One-Shot, Current)

```json
{
  "delegationRuntime": {
    "enabled": true,
    "agents": {
      "claude": {
        "command": "claude",
        "args": ["-p", "{prompt}"]
      }
    }
  }
}
```

**Behavior:** Uses one-shot ProcessAgentRunner (existing behavior)

---

### Opt-In Interactive Config

```json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "interactive",
    "interactive": {
      "enabled": true,
      "visibleWindows": true,
      "sessionIdleTimeoutMs": 300000,
      "agents": {
        "claude": {
          "command": "claude",
          "shell": "cmd",
          "completionMarker": "> "
        }
      }
    }
  }
}
```

**Behavior:** Uses new TerminalSessionManager with persistent sessions

---

### Hybrid Config (Auto-Fallback)

```json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "auto",  // Try interactive, fall back to one-shot
    "interactive": {
      "enabled": true,
      "agents": { /* ... */ }
    },
    "agents": {
      "claude": {
        "command": "claude",
        "args": ["-p", "{prompt}"]  // One-shot fallback config
      }
    }
  }
}
```

**Behavior:** Tries interactive first, falls back to one-shot if it fails

---

## Breaking Changes (None!)

The migration is **fully backward compatible**:

✅ **No config changes required** - existing configs continue to work  
✅ **No API changes** - delegate_task interface unchanged  
✅ **No behavior changes** - default behavior is one-shot (existing)  
✅ **Opt-in only** - users must explicitly enable interactive mode

---

## Deprecation Timeline (Future)

**Sprint 009 (Current):**
- Interactive mode introduced
- One-shot remains default
- Both modes fully supported

**Sprint 010+ (Future):**
- Interactive mode becomes recommended
- One-shot remains supported
- Documentation emphasizes interactive benefits

**No plans to deprecate one-shot mode** - it's useful for CI/CD and stateless environments

---

## Troubleshooting Common Migration Issues

### Issue: "Interactive mode not working"

**Symptoms:** Tasks fall back to one-shot mode every time

**Causes:**
1. CLI tool doesn't support interactive mode
2. `completionMarker` configured incorrectly
3. Terminal window closes immediately
4. CLI requires authentication prompts

**Solutions:**
```bash
# Test CLI interactively first
cmd.exe /K claude

# Verify interactive mode is supported
# Should stay open and show prompt marker (">")

# Check logs for fallback reason
log("warn", "interactive.fallback", { reason: "..." })
```

---

### Issue: "Sessions getting stuck"

**Symptoms:** Task never completes, timeout errors

**Causes:**
1. Completion marker not detected
2. Idle timeout too short
3. CLI hanging on prompt

**Solutions:**
```json
{
  "interactive": {
    "completionTimeoutMs": 180000,  // Increase timeout
    "agents": {
      "claude": {
        "completionMarker": "> ",  // Verify correct marker
        "errorPatterns": ["error:", "rate limit"]
      }
    }
  }
}
```

---

### Issue: "Too many windows open"

**Symptoms:** Multiple terminal windows accumulate

**Causes:**
1. Sessions not closing properly
2. Health checks creating new sessions
3. Crash detection failing

**Solutions:**
```json
{
  "interactive": {
    "sessionIdleTimeoutMs": 300000,    // Close after 5 min idle
    "sessionMaxAgeMs": 3600000,        // Restart after 1 hour
    "maxConsecutiveFailures": 2        // Restart sooner
  }
}
```

---

## Testing Migration

### Test Plan for Users

**Step 1: Verify one-shot still works**
```json
// squadron-config.json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "oneshot"
  }
}
```
```bash
# Run existing workflow
# Ensure no regressions
```

**Step 2: Enable interactive mode**
```json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "interactive",
    "interactive": {
      "enabled": true,
      "visibleWindows": true,
      "agents": {
        "claude": {
          "command": "claude",
          "shell": "cmd",
          "completionMarker": "> "
        }
      }
    }
  }
}
```

**Step 3: Run single task**
```typescript
// Test 1: Should open visible terminal window
delegate_task({ taskId: "test-1", executor: "claude" });
// Verify: Window opens with "claude" running

// Test 2: Should reuse same window
delegate_task({ taskId: "test-2", executor: "claude" });
// Verify: No new window, same session used

// Test 3: Should close on idle
// Wait 5 minutes
// Verify: Window closes automatically
```

**Step 4: Test fallback**
```json
{
  "interactive": {
    "agents": {
      "claude": {
        "command": "nonexistent-cli"  // Intentional failure
      }
    }
  }
}
```
```typescript
delegate_task({ taskId: "fallback-test", executor: "claude" });
// Verify: Falls back to one-shot mode, task completes
```

---

## Rollback Plan

If issues arise, users can immediately rollback:

### Option 1: Disable Interactive Mode
```json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "oneshot"  // Force one-shot
  }
}
```

### Option 2: Disable Delegation Entirely
```json
{
  "delegationRuntime": {
    "enabled": false  // Back to handoff mode
  }
}
```

### Option 3: Revert to Sprint 008 Codebase
```bash
git checkout sprint-008-tag
npm install
npm run build
```

**No data loss** - all state is in files, unaffected by execution mode

---

## Success Metrics

Track these to validate migration success:

1. **Adoption Rate:** % of users enabling interactive mode
2. **Fallback Rate:** % of interactive attempts that fall back to one-shot
3. **Performance Improvement:** Avg task execution time (interactive vs one-shot)
4. **Session Reuse Factor:** Avg tasks per session
5. **Stability:** Session crash rate, recovery success rate

**Target Goals:**
- Fallback rate < 10%
- Performance improvement > 15%
- Session reuse factor > 3
- No increase in error rates

---

## Future Considerations

### Cross-Platform Support

**Sprint 009:** Windows-only implementation  
**Future:** Linux/macOS support

**Plan:**
1. Abstract terminal spawning behind interface
2. Implement `LinuxTerminalSpawner` (using `gnome-terminal`, `xterm`)
3. Implement `MacTerminalSpawner` (using `Terminal.app`)
4. Auto-detect platform and use appropriate spawner

**Config:**
```json
{
  "interactive": {
    "platform": "auto",  // auto-detect or explicit: "windows", "linux", "macos"
    "linux": {
      "terminal": "gnome-terminal"  // or "xterm", "konsole"
    },
    "macos": {
      "terminal": "Terminal"  // or "iTerm"
    }
  }
}
```

### Advanced Features

- **Session Pools:** Multiple concurrent sessions per agent
- **Load Balancing:** Distribute tasks across sessions
- **Window Management:** Tile, minimize, restore windows
- **Session Recording:** Record all I/O for debugging
- **Hot Reload:** Restart CLI without closing window

---

## Summary

**Key Points:**
- ✅ Fully backward compatible - no breaking changes
- ✅ Opt-in feature - requires explicit configuration
- ✅ Automatic fallback - graceful degradation to one-shot
- ✅ Incremental adoption - users can migrate at their own pace
- ✅ Easy rollback - disable via config

**Recommendation:** Start with "auto" mode for best of both worlds.

