# Configuration

Squadron uses project-level configuration via `squadron-config.json`.

## Schema

Top-level keys:

- `agents`: map of agent id -> role/capabilities/cost settings
- `templates`: optional template aliases
- `roleBoundaries`: boundary policy and enforcement flags
- `tokenOptimization`: savings targets and reporting policy
- `delegationRuntime`: optional subprocess delegation runtime settings
- `stateStorage`: `memory`, `file`, or `sqlite`

Validation is implemented in `src/config/types.ts`.

## Loading Behavior

`ConfigLoader` in `src/config/loader.ts`:

- tries to load `squadron-config.json`
- validates with Zod
- merges with defaults from `DEFAULT_CONFIG`
- falls back to defaults on missing/invalid file

Startup path:

- `src/index.ts` calls `createOrchestratorServicesFromConfig()`
- loaded config is wired into role enforcement and token analytics services

## Subprocess Delegation Runtime

`delegationRuntime` controls whether `delegate_task` runs external agent CLIs directly.

Example:

```json
{
  "delegationRuntime": {
    "enabled": true,
    "defaultTimeoutMs": 120000,
    "maxOutputBytes": 131072,
    "fallbackOnFailure": true,
    "fallbackExecutors": {
      "claude": ["codex"],
      "gemini": ["codex"],
      "codex": []
    },
    "agents": {
      "claude": {
        "command": "claude",
        "args": ["-p", "{prompt}", "--output-format", "json"]
      },
      "gemini": {
        "command": "gemini",
        "args": ["-p", "{prompt}", "--output-format", "json"]
      },
      "codex": {
        "command": "codex",
        "args": ["exec", "{prompt}", "--skip-git-repo-check"]
      }
    }
  }
}
```

Notes:
- `{prompt}` is replaced with the generated delegation prompt.
- When `enabled` is false, `delegate_task` keeps handoff-only behavior.
- You can force behavior per call with `executionMode`:
  - `handoff`
  - `subprocess`
  - `auto` (uses config)

### Per-Task Model Selection

Every real subprocess delegation re-bootstraps a full agent session, which costs roughly the same regardless of how simple the task is. Rather than always paying for the executor's default model, you can request a cheaper or more capable one per task.

Add `modelFlag` to an agent's command config, templated like `args`:

```json
{
  "delegationRuntime": {
    "agents": {
      "claude": {
        "command": "claude",
        "args": ["-p", "{prompt}", "--output-format", "json"],
        "modelFlag": ["--model", "{model}"]
      }
    }
  }
}
```

Then request a model:
- At delegation time: `delegate_task({ taskId, executor, model: "sonnet" })` — overrides everything else.
- At task-creation time: pass `model` to `create_task_spec` so a task always uses the same model without repeating it on every `delegate_task` call.

If a call-time `model` and a task-spec `model` are both set, the call-time value wins. If no `modelFlag` is configured for an agent, `model` is ignored and the command runs unchanged.

Squadron ships `modelFlag` pre-configured for `claude` (`--model`) and `codex` (`--model`), verified against each CLI's own `--help` output. `gemini`'s `modelFlag` is left unset until its real flag syntax is verified — never guess a flag; an unverified one silently fails against the real CLI.

### Interactive Sessions

Squadron also supports persistent terminal sessions for subprocess execution (Windows-only, see below). See [Interactive Sessions](interactive-sessions.md) for a full guide.

Key settings in `delegationRuntime`:

- `executionMode`: Set to `"interactive"` or `"auto"` to use persistent sessions.
- `interactive.enabled`: Global toggle for session management.
- `interactive.visibleWindows`: If `true`, a visible terminal window opens on Windows.
- `interactive.agents`: Map of agent names to their interactive CLI configuration:
  - `command`: The interactive CLI command (e.g., `claude`).
  - `completionMarker`: String the CLI prints when ready (e.g., `> `).
  - `completionTimeoutMs`: Timeout for capturing full response.

## State Storage Notes

- `memory`: ephemeral process-local state
- `file`: persisted JSON state under `state/` (or `SQUADRON_STATE_DIR`)
- `sqlite`: reserved for future implementation

Current behavior for `sqlite`:
- service initialization throws an explicit error:
  `stateStorage 'sqlite' is not implemented yet. Use 'memory' or 'file'.`

`squadron init` writes `stateStorage: "file"` by default to make persistence work out of the box.
