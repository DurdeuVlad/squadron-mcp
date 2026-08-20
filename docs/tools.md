# Tools API

The core orchestration toolchain, exposed through MCP.

## `create_task_spec`

Creates a persisted task spec from a template.

Key behavior:
- loads template from `TemplateRegistry`
- merges required/default template inputs with provided `inputs` and `context`
- saves task in `StateManager`
- optionally links task to a workflow
- optional `dependsOn`: task IDs (from prior `create_task_spec` calls) that must reach `completed` before this task can be delegated; rejects self-reference, references to unknown task IDs, and direct back-references (A depends on B while B depends on A)

## `delegate_task`

Delegates a persisted task to an executor.

Key behavior:
- validates task exists
- validates executor matches task spec executor
- refuses delegation with a clear error if the task has any `dependsOn` task that isn't `completed` yet
- updates task status to `executing`
- optionally sets workflow current task
- returns a formatted handoff payload for executor agents

Subprocess mode:
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
- returns a per-task `readiness` classification (`"ready"` or `"blocked"`, with `blockedBy` naming unmet `dependsOn` task IDs) so a connecting planner can query what's safe to delegate next

## `optimize_tokens`

Analyzes token usage and optimization opportunities.

Key behavior:
- workflow-level report when `workflowId` is provided
- portfolio-level report when no workflow is specified
- recommendations based on role usage and repeated template patterns

## `classify_intent`

Classifies user intent to determine whether auto-orchestration should run.

Key behavior:
- takes a `userMessage` and returns a confidence-scored classification
- used internally by `auto_orchestrate`, but callable standalone

## `extract_workflow_params`

Extracts structured workflow parameters from a natural language request.

Key behavior:
- takes a `userMessage` (and optionally a prior `classification`) and returns structured params (task, executor, template hints)
- used internally by `auto_orchestrate`, but callable standalone

## `detect_context`

Detects workspace context signals used for auto-orchestration decisions.

Key behavior:
- takes optional `currentFile`/`currentFolder` and returns workspace context (language, project type, relevant signals)
- used internally by `auto_orchestrate`, but callable standalone

## `auto_orchestrate`

Classifies intent, extracts workflow parameters, and intelligently decides whether to run a workflow - the single entry point that chains `detect_context` → `classify_intent` → `extract_workflow_params` → (if confidence is high enough) `execute_workflow` internally, including automatic QA prompt injection during execution. See [Auto-Orchestration Guide](AUTO_ORCHESTRATION.md).
