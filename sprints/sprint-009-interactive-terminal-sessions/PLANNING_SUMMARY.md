# Sprint 009 Planning Summary

**Created:** 2026-02-14  
**Status:** Planning Complete ✅

---

## What We're Building

Transform the MCP orchestrator from **one-shot subprocess execution** to **persistent interactive terminal sessions**.

### Current Problem
- Each task spawns a new process: `claude -p "prompt"` → exit
- Startup overhead every time (~2s)
- No user visibility (hidden background processes)
- User has CLI subscriptions but can't use them effectively

### Solution
- Open **visible Windows terminal windows**
- Start **interactive AI CLI tools** (like `claude` without `-p` flag)
- Keep sessions **alive and reusable** across tasks
- Send prompts via stdin, capture responses via stdout
- **15-20% faster** due to session reuse

---

## Planning Documents Created

1. **[README.md](README.md)** - Sprint overview, architecture, success criteria
2. **[TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md)** - Detailed interfaces, implementation patterns, testing strategy
3. **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Backward compatibility, configuration migration, rollback plan

---

## Key Architectural Decisions

### 1. Component Structure
```
delegate_task (tool)
    ↓
TerminalSessionManager (coordinator - session pool)
    ↓
InteractiveTerminalSession (per-agent persistent session)
    ↓
WindowsTerminalSpawner (OS-specific window management)
    ↓
CompletionDetector (AI response parsing)
```

### 2. Execution Strategy Pattern
- **Auto Mode:** Try interactive, fall back to one-shot if it fails
- **Interactive Mode:** Use persistent sessions exclusively
- **One-Shot Mode:** Use existing ProcessAgentRunner (Sprint 008)

### 3. Session Lifecycle
```
[initializing] → [ready] ⇄ [busy] → [ready]
                    ↓           ↓
               [error] ← → [restart]
                    ↓
               [closed]
```

### 4. Completion Detection (Hybrid Strategy)
- **Primary:** Wait for completion marker (e.g., `"> "` for Claude)
- **Fallback:** Idle timeout (no output for 3s)
- **Safety:** Absolute timeout (120s max)
- **Error Detection:** Pattern matching for known error strings

### 5. Windows Terminal Spawning
```powershell
# Visible command prompt with interactive CLI
cmd.exe /K "claude"

# Alternative: PowerShell
powershell.exe -NoExit -Command "gemini"
```

---

## Backward Compatibility Guarantee

✅ **No breaking changes**  
✅ **Opt-in only** (default stays one-shot)  
✅ **Automatic fallback** (interactive fails → one-shot succeeds)  
✅ **Easy rollback** (config change only)

### Migration Path
```json
// Phase 1: Current users (no change)
{
  "delegationRuntime": {
    "enabled": true
  }
}

// Phase 2: Opt-in interactive
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "interactive",
    "interactive": { "enabled": true }
  }
}

// Phase 3: Auto-detect (best of both)
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "auto"  // Try interactive, fall back to one-shot
  }
}
```

---

## Implementation Plan (6 Tasks)

### Task 1: InteractiveTerminalSession (Core Class)
**Duration:** 1 day  
**Deliverables:**
- Spawn visible Windows terminal window
- Maintain stdin/stdout/stderr pipes
- Session state management
- Completion detection
- Health tracking

### Task 2: TerminalSessionManager (Pool Coordinator)
**Duration:** 1 day  
**Deliverables:**
- Session pool management (one per agent initially)
- `getOrCreateSession` logic
- Lifecycle automation (idle timeout, health checks)
- Graceful shutdown

### Task 3: CompletionDetector (Response Parser)
**Duration:** 0.5 days  
**Deliverables:**
- Marker-based detection
- Timeout-based fallback
- Error pattern matching
- Configurable strategies per agent

### Task 4: Configuration Schema Updates
**Duration:** 0.5 days  
**Deliverables:**
- `InteractiveSessionConfig` schema
- Update `DelegationRuntime` schema
- Default configurations
- Validation

### Task 5: Integration with delegate_task
**Duration:** 1 day  
**Deliverables:**
- Execution strategy selection
- Fallback logic (interactive → one-shot)
- State updates for interactive mode
- Metrics tracking

### Task 6: Testing & Documentation
**Duration:** 2 days  
**Deliverables:**
- Unit tests (session lifecycle, completion detection)
- Integration tests (pool management, fallback)
- E2E test (manual with real CLI)
- User guide, troubleshooting, examples

**Total Duration:** 5-7 days

---

## Success Criteria

### Functional
- ✅ Open visible Windows terminal windows with AI CLIs
- ✅ Keep sessions alive across multiple tasks (reuse factor > 3)
- ✅ Send prompts via stdin and capture responses correctly
- ✅ Detect completion reliably (no truncated responses)
- ✅ Handle session crashes with automatic restart
- ✅ Fallback to one-shot mode if interactive unavailable

### Quality
- ✅ All existing tests pass (backward compatibility)
- ✅ New tests cover lifecycle (create, execute, restart, close)
- ✅ No memory leaks (session timeout enforced)
- ✅ Clean shutdown closes all windows

### Documentation
- ✅ Configuration guide with examples
- ✅ Troubleshooting guide for common issues
- ✅ Migration guide for existing users

### Performance
- ✅ 15-20% faster execution for multi-task workflows
- ✅ Session reuse factor > 3 (avg tasks per session)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI CLI doesn't support interactive mode | High | Automatic fallback to one-shot + doc requirements |
| Completion detection unreliable | High | Multiple strategies (marker + timeout + error patterns) |
| Windows-only implementation limits adoption | Medium | Document as MVP, cross-platform in future sprint |
| Memory leaks from long-running sessions | Medium | Session max age (1hr), idle timeout (5min), health checks |
| User confusion with visible windows | Low | Clear documentation, configurable visibility |

---

## Future Enhancements (Post-Sprint)

1. **Cross-Platform Support:** Linux/macOS terminal management
2. **Session Pools:** Multiple concurrent sessions per agent for parallel execution
3. **Window Management:** Tiled layout, minimize/restore, positioning
4. **Advanced Monitoring:** Memory usage, response time histograms
5. **Session Recording:** Log all I/O for debugging
6. **Hot Reload:** Restart CLI without closing window

---

## Dependencies

### Required
- Node.js `child_process` module (built-in)
- Windows OS (CMD.exe or PowerShell)
- Compatible AI CLI tools (claude, gemini, codex with interactive mode)

### Optional
- Windows API for window positioning (future)
- Terminal emulators (Windows Terminal, ConEmu) for better UX

---

## Next Steps

### For Implementation (Gemini)
1. Read these planning docs thoroughly
2. Start with Task 1: `InteractiveTerminalSession` class
3. Follow technical design specifications
4. Write tests alongside implementation
5. Report back with progress and blockers

### For Review (Claude)
1. Review implementations against design docs
2. Validate backward compatibility
3. Approve milestones (Task 1, Task 2, etc.)
4. Make adjustments as needed

---

## Questions Resolved

✅ **Visible vs Hidden Windows:** Visible (user requirement)  
✅ **CLI Access Method:** Native CLI tools in interactive mode  
✅ **Session Persistence:** Persistent, reusable across tasks  
✅ **Backward Compatibility:** Fully compatible, opt-in only  
✅ **Fallback Strategy:** Automatic to one-shot on interactive failure  
✅ **Platform Support:** Windows MVP, cross-platform future

---

## Planning Complete ✅

**All architecture decisions made**  
**Technical design documented**  
**Migration strategy defined**  
**Ready for implementation**

Time to build! 🚀

