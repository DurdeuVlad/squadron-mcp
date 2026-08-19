# Task 1: Execution Runtime Config

**Sprint:** 008  
**Complexity:** Medium  
**Estimate:** 0.5-1 day  
**Dependencies:** None

---

## Goal

Define configuration schema for subprocess delegation so runtime behavior is explicit and testable.

---

## Planned Changes

- Extend `src/config/types.ts` with `delegationRuntime` section:
  - `enabled: boolean`
  - `defaultTimeoutMs: number`
  - `maxOutputBytes: number`
  - `fallbackOnFailure: boolean`
  - per-agent command templates:
    - `claude.command`, `claude.args`
    - `gemini.command`, `gemini.args`
    - `codex.command`, `codex.args`
- Add safe defaults in `DEFAULT_CONFIG`.
- Document merge behavior with project `squadron-config.json`.

---

## Acceptance Criteria

- schema validates valid config and rejects malformed runtime configs
- default config remains backward compatible
- existing config tests pass; new tests cover runtime config parsing

---

## Validation

- `npm test -- tests/config/types.test.ts`
- `npm test -- tests/config/loader.test.ts`

