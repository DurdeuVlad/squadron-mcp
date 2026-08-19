# Changelog

## Unreleased

- **Renamed the project to Squadron.** npm package `@vladddev/mcp-agent-orchestrator` → `squadron-mcp`, CLI `agent-orchestra` → `squadron`, MCP server identity `agent-orchestrator` → `squadron`, default config filename `orchestrator-config.json` → `squadron-config.json`, env var `ORCHESTRATOR_STATE_DIR` → `SQUADRON_STATE_DIR`. See `docs/MIGRATION.md`. The GitHub repository path itself is unchanged.
- Fixed `DEFAULT_CONFIG.delegationRuntime` missing `executionMode`, which broke `npm run build`/`npm install` for every fresh clone.
- Moved AI-agent build-coordination docs (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX_START.md`, `sprints/`, `.ai/`, plus a few project-status snapshots) into `.internal/` — historical, not user-facing.
- Removed the committed npm-pack tarball and 13 accidentally-committed local dev `state/tasks/*.json` runtime logs; fixed the `.gitignore` pattern that let the latter slip through (`state/*.json` didn't match nested `state/tasks/*.json`).
- Fixed `package.json`/README references pointing at the wrong GitHub org (`vladddev` instead of `DurdeuVlad`).

## 0.1.0 - 2026-02-12

- Added core MCP server and orchestration tools (`create_task_spec`, `delegate_task`, `collect_report`, `review_output`, `track_workflow`, `optimize_tokens`).
- Added template loading/validation and workflow/task state management.
- Added config system, role boundary enforcement, token tracking, and quality gates.
- Added Sprint 005 production features:
  - CLI (`squadron`) with `init`, `task create`, `workflow track`, `metrics`, `dashboard`.
  - Dashboard server and web UI (`/api/workflows`, `/api/metrics`).
  - File-backed state persistence via `FileStorageAdapter`.
  - Additional docs, tests, and packaging assets.
