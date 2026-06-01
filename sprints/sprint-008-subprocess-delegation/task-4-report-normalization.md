# Task 4: Report Normalization and State Enrichment

**Sprint:** 008  
**Complexity:** High  
**Estimate:** 1 day  
**Dependencies:** Task 3

---

## Goal

Normalize executor subprocess output into orchestrator state/report structures for downstream review and tracking.

---

## Planned Changes

- Extend `src/state/types.ts` with execution metadata for tasks:
  - `agentUsed`
  - `fallbackUsed`
  - `execution` object (`status`, `exitCode`, `durationMs`, `startedAt`, `endedAt`)
- Update `src/state/state-manager.ts` with helper methods to persist execution metadata.
- Update `src/tools/delegate-task.ts` and/or shared helper to:
  - map subprocess result into normalized report payload
  - keep compatibility with `collect_report` flow

---

## Acceptance Criteria

- execution metadata is persisted and retrievable
- task status transitions remain valid under success/failure/timeout
- normalized report data can be consumed by review/tracking tools

---

## Validation

- `npm test -- tests/state/types.test.ts`
- `npm test -- tests/state/state-manager.test.ts`
- `npm test -- tests/tools/collect-report.test.ts`

