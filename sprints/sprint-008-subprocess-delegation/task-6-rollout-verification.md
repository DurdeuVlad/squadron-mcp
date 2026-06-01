# Task 6: Rollout Docs and Verification

**Sprint:** 008  
**Complexity:** Medium  
**Estimate:** 0.5 day  
**Dependencies:** Task 1-5

---

## Goal

Document how to enable subprocess delegation and provide reproducible verification steps for local environments.

---

## Planned Changes

- Update `docs/tools.md` with real delegation mode semantics
- Update `docs/configuration.md` with `delegationRuntime` schema and examples
- Update `docs/getting-started.md` with verification flow:
  - list tools
  - create task
  - delegate task in runtime-enabled mode
  - confirm state + report fields
- Add troubleshooting section:
  - missing CLI in PATH
  - login/auth not initialized
  - timeout tuning and output truncation

---

## Acceptance Criteria

- docs reflect both legacy (simulated) and runtime-enabled delegation behavior
- local verification steps are runnable end-to-end
- known failure modes and mitigations documented

---

## Validation

- manual smoke run via MCP client
- `npm test`

