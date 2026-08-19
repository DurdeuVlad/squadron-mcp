# API Reference

MCP tools exposed by the server:

- `ping`
- `create_task_spec`
- `delegate_task`
- `collect_report`
- `review_output`
- `track_workflow`
- `optimize_tokens`
- `classify_intent`
- `extract_workflow_params`
- `detect_context`
- `auto_orchestrate`

See full payload schemas and examples in [`docs/tools.md`](tools.md).

MCP prompts exposed by the server: `plan_delegation`, `review_report`, `track_workflow_status`, `optimize_tokens` — see [`docs/prompts.md`](prompts.md).

Both lists (and templates/plugins) can be extended without forking — see [`docs/plugins.md`](plugins.md).
