# Sprint 008: Real Subprocess Delegation

**Status:** Planned (2026-02-13)  
**Duration:** 4-6 days  
**Dependencies:** Sprints 001-007

---

## Problem Statement

`delegate_task` currently updates state and returns a formatted handoff message, but does not execute external agents.  
This leaves orchestration as a simulation.

**Goal:** add real subprocess delegation to Claude/Gemini/Codex CLIs with fallback, execution telemetry, and normalized report capture.

---

## Baseline (Verified)

Current behavior in `src/tools/delegate-task.ts`:
- validates task + executor
- marks task as `executing`
- returns `formattedTask`
- does **not** run a subprocess

This sprint closes that gap.

---

## Success Criteria

- `delegate_task` can run real CLI subprocesses for `claude`, `gemini`, `codex`
- configurable command/args/timeouts via orchestrator config
- captured execution metadata (exit code, duration, stdout/stderr, fallback usage)
- fallback path works (preferred executor fails -> fallback executor)
- deterministic timeout and cancellation behavior
- test coverage for success/failure/timeout/fallback and state transitions
- docs include setup + troubleshooting for local CLI auth and PATH/cwd issues

---

## Sprint Breakdown (6 Tasks)

1. [Task 1: Execution Runtime Config](task-1-execution-runtime-config.md)
2. [Task 2: Subprocess Runner](task-2-subprocess-runner.md)
3. [Task 3: Delegate Tool Integration](task-3-delegate-tool-integration.md)
4. [Task 4: Report Normalization and State Enrichment](task-4-report-normalization.md)
5. [Task 5: Test Matrix and Harness](task-5-test-matrix.md)
6. [Task 6: Rollout Docs and Verification](task-6-rollout-verification.md)

---

## Technical Scope

### New runtime layer
- `src/execution/agent-runner.ts`
- `src/execution/prompt-builder.ts`
- optional: `src/execution/types.ts`

### Config additions
- extend `src/config/types.ts`
- defaults in `DEFAULT_CONFIG`
- docs update for `orchestrator-config.json`

### Tool integration
- update `src/tools/delegate-task.ts` with execution mode
- preserve current formatted-handoff response for backward compatibility

### State/observability
- extend `src/state/types.ts` and `src/state/state-manager.ts` for execution metadata
- add execution logs via `src/utils/logger.ts`

---

## CLI Contract (Observed Locally)

Non-interactive interfaces to target:

- Claude CLI:
  - `claude -p "<prompt>"`
  - supports `--output-format json` with `--print`
- Gemini CLI:
  - `gemini -p "<prompt>"`
- Codex CLI:
  - `codex exec "<prompt>"`

The runner must use configurable command templates and avoid hardcoded assumptions.

---

## Risk Areas

- CLI availability and PATH differences between interactive terminal and subprocess env
- output parsing differences across agent CLIs
- long-running tasks and timeout tuning
- fallback loops and duplicate report writes

---

## Definition of Done

- all sprint task acceptance criteria pass
- `npm test` passes
- integration smoke test proves create -> delegate (real subprocess) -> normalized report path
- docs updated with reproducible setup and test steps

