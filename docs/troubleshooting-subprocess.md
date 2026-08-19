# Troubleshooting: one-shot subprocess delegation

This covers the default (non-interactive) `delegate_task` execution path — spawning `claude`/`gemini`/`codex` as a one-shot subprocess via `ProcessAgentRunner`. For interactive terminal sessions, see [interactive-sessions.md](interactive-sessions.md).

## CLI not found in `PATH`

Symptom: `delegate_task` returns a `failed` execution with a spawn error (`ENOENT`) in `stderr`, or `agent-runner` fails immediately with no exit code.

`delegationRuntime.agents.<claude|gemini|codex>.command` (default: `claude`, `gemini`, `codex` respectively) must resolve on `PATH` in the environment the Squadron process runs in — not just in your interactive shell. If you normally launch Squadron from an IDE, a systemd service, or a different shell profile, `PATH` may not include the directory these CLIs are installed in. Verify with `which claude` / `which gemini` / `which codex` in the *same* environment Squadron starts from, or set an absolute path in `command`.

## Agent not authenticated

Symptom: the subprocess exits non-zero quickly, `stderr` mentions login/auth, or `stdout` is empty/an auth prompt instead of JSON.

Squadron doesn't manage CLI login state — it assumes `claude`/`gemini`/`codex` are already authenticated the same way they'd be if you ran them by hand. Run the CLI directly with the same prompt/args Squadron would use (see `delegationRuntime.agents.<agent>.args`) to confirm it works standalone before delegating through Squadron.

## Timeout tuning

Symptom: tasks come back `status: "timed_out"` in `executionHistory`.

- `delegationRuntime.defaultTimeoutMs` (default `120_000`) is the global default; override per-call via the `delegate_task` tool's `timeoutMs` input for tasks you know run long.
- `delegationRuntime.maxOutputBytes` (default `131_072`) truncates stdout/stderr past that size with a `"...[truncated]"` marker — if `report-normalizer.ts`'s JSON parsing is failing on an otherwise-successful run, check whether the report got cut off mid-JSON here first.

## Garbled or unparseable output

`report-normalizer.ts` tries, in order: direct `JSON.parse`, fenced ` ```json ` block extraction, "first `{` to last `}`" embedded-JSON extraction, and finally falls back to plain text (truncated to 2000 chars) if none of those parse. If reports are consistently falling back to plain text, check the agent's actual stdout — it may not be honoring the JSON-output contract in the prompt Squadron builds (`prompt-builder.ts`), which can happen if the CLI's own flags (`--output-format json`, etc.) aren't set correctly in `delegationRuntime.agents.<agent>.args`.

## Fallback behavior

If `delegationRuntime.fallbackOnFailure` is `true` (default), a failing executor automatically retries with the next agent in `delegationRuntime.fallbackExecutors.<agent>` (default: `claude`/`gemini` → `codex`, `codex` → none). Check `task.executionHistory` for one entry per attempt, including failed ones, to see the full fallback chain that was tried.
