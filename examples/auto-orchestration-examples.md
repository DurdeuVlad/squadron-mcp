# Auto-Orchestration Examples

## 1) Clear workflow request

Input:

`Implement JWT authentication with refresh tokens`

Expected:

- `classify_intent` => `workflow-candidate`
- `auto_orchestrate` => `trigger-workflow` (high confidence)

## 2) Medium confidence request

Input:

`Implement this`

Context:

`sprints/sprint-006-auto-orchestration`

Expected:

- context boost from sprint folder
- likely `ask-confirmation`

## 3) Audit workflow

Input:

`Audit API endpoints from security perspective`

Expected:

- `workflowParams.isAudit = true`
- `workflowParams.perspective = "security"`
- `workflowParams.template = "audit-workflow"`

## 4) Simple question

Input:

`What is auto orchestration?`

Expected:

- direct answer path
- no workflow execution
