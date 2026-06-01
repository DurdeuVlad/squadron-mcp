# Task 5: Test Matrix and Harness

**Sprint:** 008  
**Complexity:** Medium  
**Estimate:** 0.5-1 day  
**Dependencies:** Task 2, Task 3, Task 4

---

## Goal

Add deterministic tests for subprocess delegation behavior without relying on real external networked agent calls.

---

## Planned Changes

- Add `tests/execution/agent-runner.test.ts`:
  - success case
  - non-zero exit case
  - timeout case
- Extend `tests/tools/delegate-task.test.ts`:
  - runtime disabled compatibility
  - runtime enabled success
  - runtime enabled timeout/failure
  - fallback path to codex
- Add integration test:
  - `tests/integration/subprocess-delegation.test.ts`
  - create task -> delegate with mocked runner -> validate state/report

---

## Acceptance Criteria

- all new tests pass locally
- tests do not depend on actual Claude/Gemini API responses
- regression coverage for legacy delegation path remains intact

---

## Validation

- `npm test`

