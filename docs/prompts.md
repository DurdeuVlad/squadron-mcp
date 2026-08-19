# Prompts API

Squadron exposes MCP's formal **Prompts** capability (`prompts/list` and `prompts/get`) alongside Tools — discoverable, ready-made prompt templates that teach a connecting AI client when and how to use Squadron's tools, rather than relying on tool descriptions alone.

Prompts are read-only templates: calling `prompts/get` returns a list of chat messages to seed a conversation with, it doesn't execute anything itself. Each one maps to a workflow across one or more of the [Tools](tools.md).

## `plan_delegation`

Walks through creating a task spec and delegating it to the right agent.

- `taskDescription` (required) — what needs to be done
- `constraints` (optional) — any constraints or context to consider

## `review_report`

Walks through collecting and reviewing the report for a completed task.

- `taskId` (required) — the task to review

## `track_workflow_status`

Walks through checking progress on a multi-task workflow.

- `workflowId` (optional) — omit for guidance on finding one

## `optimize_tokens`

Walks through checking token usage and when to compact context.

- `taskId` (optional) — omit for aggregate/workflow-level usage

## Adding your own

Prompts are registered the same way tools are — see `src/prompts/registry.ts` (`PromptRegistry`) and `src/prompts/index.ts` (`createDefaultPromptRegistry`). A [plugin](plugins.md) can also contribute prompts via `registerPrompts`, so a plugin that adds a new tool can ship a matching usage prompt alongside it.
