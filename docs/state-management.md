# State Management

Sprint 002 adds in-memory orchestration state tracking.

## Core Types

Defined in `src/state/types.ts`:

- `TaskSpec`
- `Task`
- `WorkflowState`
- `TaskStatus`
- `WorkflowStatus`

All state structures are validated with Zod schemas.

## StateManager API

Implemented in `src/state/state-manager.ts`.

### Task methods

- `createTask(spec)`
- `getTask(id)`
- `listTasks()`
- `updateTaskStatus(id, status)`
- `attachTaskReport(id, report)`
- `trackTaskTokenUsage(id, tokens)`

### Workflow methods

- `createWorkflow(name?)`
- `getWorkflow(id)`
- `listWorkflows()`
- `addTaskToWorkflow(workflowId, taskId)`
- `setWorkflowCurrentTask(workflowId, taskId | null)`
- `trackWorkflowTokenUsage(workflowId, stage, tokens)`
- `completeWorkflow(workflowId)`
- `failWorkflow(workflowId)`

## Tool Integration

- `create_task_spec` creates persisted tasks in state manager
- `delegate_task` updates task executor/status and optional workflow linkage
- `collect_report` attaches report data and tracks token usage
