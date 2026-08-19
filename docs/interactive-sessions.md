# Interactive Terminal Sessions

## Overview

Interactive Terminal Sessions transform subprocess execution from **one-shot** (spawn → run → exit) to **persistent interactive sessions** (spawn once → reuse many times). This provides several benefits:

1.  **Performance:** Saves 1-3 seconds per task by avoiding CLI startup overhead.
2.  **Visibility:** Opens a visible terminal window where you can see the AI executing tasks in real-time.
3.  **State Persistence:** Some CLIs maintain local state or context between commands when run interactively.

## Platform support

Interactive sessions are implemented via `WindowsTerminalSpawner`, which shells out to `cmd.exe`/`powershell.exe` — **this is Windows-only today**. There is no POSIX/macOS terminal spawner. On macOS/Linux, setting `executionMode: "auto"` will silently fall back to one-shot subprocess execution (see [troubleshooting-subprocess.md](troubleshooting-subprocess.md)) instead of opening an interactive session; setting `executionMode: "interactive"` explicitly on a non-Windows host will fail. This is a known limitation, not a bug — a POSIX/macOS spawner is tracked as future work, not planned in the current release.

## Configuration

Interactive sessions are configured within the `delegationRuntime` section of your `squadron-config.json`.

```json
{
  "delegationRuntime": {
    "enabled": true,
    "executionMode": "auto",
    "interactive": {
      "enabled": true,
      "visibleWindows": true,
      "sessionIdleTimeoutMs": 300000,
      "sessionMaxAgeMs": 3600000,
      "agents": {
        "claude": {
          "command": "claude",
          "shell": "cmd",
          "completionMarker": "> ",
          "completionTimeoutMs": 120000
        },
        "gemini": {
          "command": "gemini",
          "shell": "cmd",
          "completionMarker": "> ",
          "completionTimeoutMs": 120000
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Description | Default |
| :--- | :--- | :--- |
| `enabled` | Whether interactive mode is available. | `false` |
| `visibleWindows` | Whether to show the terminal window. | `true` |
| `sessionIdleTimeoutMs` | How long to keep a session alive without activity. | `300000` (5 min) |
| `sessionMaxAgeMs` | Maximum lifetime of a session before restart. | `3600000` (1 hour) |
| `executionMode` | `oneshot`, `interactive`, or `auto`. | `oneshot` |

### Agent-Specific Options

| Option | Description |
| :--- | :--- |
| `command` | The CLI command to start the interactive session. |
| `shell` | `cmd` or `powershell`. |
| `completionMarker` | The string the CLI prints when it's ready for next input. |
| `completionTimeoutMs` | How long to wait for a response before timing out. |
| `errorPatterns` | Optional list of strings that indicate an execution error. |

## How it Works

1.  **Selection:** When a task is delegated, the orchestrator checks if interactive mode is enabled and preferred.
2.  **Creation:** If no session exists for the agent, a new terminal window is opened and the CLI command is executed.
3.  **Detection:** The orchestrator waits for the `completionMarker` to appear in the terminal output to ensure the CLI is ready.
4.  **Execution:** The task prompt is sent to the CLI's `stdin`.
5.  **Completion:** The orchestrator captures `stdout` until the `completionMarker` appears again.
6.  **Reuse:** The session remains open and "Ready" for the next task delegated to the same agent.
7.  **Cleanup:** If the session is idle for too long or exceeds its maximum age, it is automatically closed.

## Fallback Mechanism

If interactive mode fails to initialize or a session crashes during execution, the orchestrator automatically falls back to **one-shot mode** for that task to ensure execution continuity.

## Troubleshooting

### Terminal Window Closes Immediately
Ensure the `command` is valid and the CLI tool is in your PATH. You can test this by running the command manually in a terminal.

### Orchestrator Hangs waiting for response
Check if the `completionMarker` matches exactly what your CLI tool prints when idle. Common markers are `> `, `$` , or custom prompts like `claude> `.

### Response is truncated
The orchestrator captures everything between the prompt and the marker. If your CLI tool prints additional info after the marker, it might be missed or captured in the *next* task.
