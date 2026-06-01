# Sprint 008 Summary: Real Subprocess Delegation

## Objective

Enable true agent execution by running external Claude/Gemini/Codex CLIs from orchestrator tools.

## Why This Sprint

Current orchestration produces delegation artifacts but does not run executor processes.  
This sprint turns delegation into actual execution.

## Deliverables

- execution runtime config and defaults
- subprocess runner with timeout/error handling
- `delegate_task` integration for real execution mode
- normalized report + execution metadata capture
- fallback and retry behavior
- tests + docs + validation checklist

## Primary Files (Planned)

- `src/config/types.ts`
- `src/state/types.ts`
- `src/state/state-manager.ts`
- `src/tools/delegate-task.ts`
- `src/execution/agent-runner.ts`
- `src/execution/prompt-builder.ts`
- `tests/tools/delegate-task.test.ts`
- `tests/integration/subprocess-delegation.test.ts`
- `docs/tools.md`
- `docs/configuration.md`

## Completion Gates

- real subprocess invocation proven in tests
- fallback path proven in tests
- no regression in existing orchestration flow

