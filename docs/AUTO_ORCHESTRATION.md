# Auto-Orchestration Guide

Sprint 006 adds intelligent request routing so the orchestrator can decide:

- answer directly
- use a single MCP tool
- ask for confirmation
- trigger a full workflow

## New Tools

- `classify_intent`
- `extract_workflow_params`
- `detect_context`
- `auto_orchestrate`

## Decision Flow

1. Classify user intent.
2. Detect workspace context (`sprints/`, `tests/`, `docs/`, current file).
3. Extract workflow parameters from natural language.
4. Combine confidence scores and apply thresholds.
5. Trigger workflow automatically or ask confirmation.

## Environment Controls

```bash
AUTO_TRIGGER_WORKFLOWS=true
AUTO_TRIGGER_CONFIDENCE=0.8
AUTO_TRIGGER_ASK_FIRST=true
YOLO_MODE_CONFIDENCE=0.95
CONFIRMATION_TIMEOUT=3000
CONTEXT_DETECTION_ENABLED=true
```

## Copilot Usage Pattern

Natural-language prompts are enough:

- `Implement format templates for debates`
- `Audit API endpoints from security perspective`
- `Continue this` (inside a sprint folder)

Manual override is still possible:

- `Run workflow: implement authentication`

## Troubleshooting

- Too many workflow triggers: increase `AUTO_TRIGGER_CONFIDENCE` and keep `AUTO_TRIGGER_ASK_FIRST=true`.
- Not enough workflow triggers: lower `AUTO_TRIGGER_CONFIDENCE`.
- Wrong inferred goal: provide a more specific request or pass explicit context.
