# Changelog

## 0.1.0 - 2026-02-12

- Added core MCP server and orchestration tools (`create_task_spec`, `delegate_task`, `collect_report`, `review_output`, `track_workflow`, `optimize_tokens`).
- Added template loading/validation and workflow/task state management.
- Added config system, role boundary enforcement, token tracking, and quality gates.
- Added Sprint 005 production features:
  - CLI (`agent-orchestra`) with `init`, `task create`, `workflow track`, `metrics`, `dashboard`.
  - Dashboard server and web UI (`/api/workflows`, `/api/metrics`).
  - File-backed state persistence via `FileStorageAdapter`.
  - Additional docs, tests, and packaging assets.
