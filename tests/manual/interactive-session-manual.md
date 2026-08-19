# Manual E2E Test for Interactive Sessions

## Prerequisites
- Windows OS
- AI CLI tool installed (e.g., `claude`, `gemini`, or a dummy interactive script)
- MCP server built (`npm run build`)

## Test Scenario 1: Basic Interactive Execution

1. **Configure `squadron-config.json`**:
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
             "completionMarker": "> ",
             "completionTimeoutMs": 30000
           }
         }
       }
     }
   }
   ```

2. **Run a delegation task**:
   Call `delegate_task` via MCP with `executor: "claude"`.

3. **Verification**:
   - [ ] A new CMD window opens.
   - [ ] The `claude` CLI starts inside that window.
   - [ ] The task prompt is sent.
   - [ ] The result is returned to the orchestrator.
   - [ ] The window **remains open** after completion.

## Test Scenario 2: Session Reuse

1. **Execute a second task**:
   Immediately call `delegate_task` again for the same executor (`claude`).

2. **Verification**:
   - [ ] **No new window** opens.
   - [ ] The second task executes in the **existing** window.
   - [ ] Task count in logs/state increases.

## Test Scenario 3: Fallback on Failure

1. **Simulate Crash**:
   Close the terminal window manually while a task is running or before starting one.

2. **Execute a task**:
   Call `delegate_task`.

3. **Verification**:
   - [ ] Orchestrator detects the session is closed/errored.
   - [ ] Orchestrator falls back to one-shot mode (or restarts the session if configured).
   - [ ] Task eventually completes or fails gracefully.

## Test Scenario 4: Idle Timeout

1. **Wait**:
   Leave the session idle for longer than `sessionIdleTimeoutMs` (default 5 min).

2. **Verification**:
   - [ ] The terminal window closes automatically.
   - [ ] Logs show `session.idle_timeout`.
