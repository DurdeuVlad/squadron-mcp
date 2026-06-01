# Task 2: Subprocess Runner

**Sprint:** 008  
**Complexity:** High  
**Estimate:** 1-1.5 days  
**Dependencies:** Task 1

---

## Goal

Implement a reusable process runner for agent CLI execution with deterministic timeout and output capture.

---

## Planned Changes

- Add `src/execution/agent-runner.ts`:
  - wraps `child_process.spawn`
  - supports `cwd`, `env`, timeout, and output truncation
  - returns structured result:
    - `status` (`completed` | `failed` | `timed_out`)
    - `exitCode`, `signal`, `durationMs`
    - `stdout`, `stderr`
- Add `src/execution/prompt-builder.ts`:
  - turns task spec + formatted handoff into CLI prompt payload
  - supports per-agent prompt wrappers when needed
- Add logging events via `src/utils/logger.ts` usage.

---

## Acceptance Criteria

- runner handles success, non-zero exit, and timeout cases
- timeout kills process and marks status correctly
- output capture and truncation are deterministic
- no direct tool-specific logic leaks into runner module

---

## Validation

- `npm test -- tests/execution/agent-runner.test.ts`

