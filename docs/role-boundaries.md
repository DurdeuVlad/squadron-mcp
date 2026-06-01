# Role Boundaries

Role boundaries are enforced by `RoleEnforcer` in `src/enforcement/role-enforcer.ts`.

## Enforcement

- Capability checks: `checkCapability(agent, capability)`
- Delegation checks: `enforceTaskDelegation(planner, executor, taskName)`
- Efficiency hint: `shouldDelegateCodeReading(agent, fileSizeLines)`

## Tool Integration

- `create_task_spec` validates planner has `planning` capability
- `delegate_task` validates planner/executor delegation compatibility

If `roleBoundaries.enforce` is `false`, checks are bypassed.
