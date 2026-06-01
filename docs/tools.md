# Tools API

Sprint 003 exposes the core orchestration toolchain through MCP.

## `create_task_spec`

Creates a persisted task spec from a template.

Key behavior:
- loads template from `TemplateRegistry`
- merges required/default template inputs with provided `inputs` and `context`
- saves task in `StateManager`
- optionally links task to a workflow

## `delegate_task`

Delegates a persisted task to an executor.

Key behavior:
- validates task exists
- validates executor matches task spec executor
- updates task status to `executing`
- optionally sets workflow current task
- returns a formatted handoff payload for executor agents

Subprocess mode (Sprint 008):
- when `delegationRuntime.enabled=true` (or input `executionMode="subprocess"`), runs configured external CLI subprocess for executor
- captures stdout/stderr, exit code, duration, and fallback attempts
- normalizes executor output into task report payload
- updates task status to `completed` or `failed`

## `collect_report`

Stores execution output and updates task/workflow token accounting.

Key behavior:
- validates task exists
- stores report payload on task
- updates task status from report status
- tracks task token usage
- tracks workflow token usage when `workflowId` is provided

## `review_output`

Records planner review decision.

Key behavior:
- requires task report to exist
- persists review metadata (`reviewer`, `criteria`, `decision`, `feedback`)
- updates task status:
  - `approve` -> `completed`
  - `revise` -> `pending`
  - `reject` -> `failed`

## `track_workflow`

Returns workflow progress and token metrics.

Key behavior:
- returns counts by task state
- returns stage token usage + total
- includes current task and textual summary

## `optimize_tokens`

Analyzes token usage and optimization opportunities.

Key behavior:
- workflow-level report when `workflowId` is provided
- portfolio-level report when no workflow is specified
- recommendations based on role usage and repeated template patterns
