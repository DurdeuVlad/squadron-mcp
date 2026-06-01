# Task 3: Delegate Tool Integration

**Sprint:** 008  
**Complexity:** High  
**Estimate:** 1 day  
**Dependencies:** Task 1, Task 2

---

## Goal

Integrate subprocess runner into `delegate_task` so delegation can execute the assigned agent CLI directly.

---

## Planned Changes

- Update `src/tools/delegate-task.ts`:
  - preserve current validation/state transitions
  - when `delegationRuntime.enabled` is true:
    - resolve agent command config
    - execute subprocess through runner
    - attach execution result to tool output
  - when disabled:
    - keep current behavior unchanged
- Keep backward-compatible response fields and add optional execution fields.

---

## Acceptance Criteria

- existing `delegate_task` behavior remains valid when runtime disabled
- runtime-enabled mode executes configured agent command
- failure and timeout paths return actionable error metadata
- planner/executor role enforcement remains intact

---

## Validation

- `npm test -- tests/tools/delegate-task.test.ts`
- `npm test -- tests/tools/orchestration-workflow.test.ts`

