# Changelog

## 0.2.0 - 2026-08-19

First public-release pass: rebrand, a real subprocess-delegation cleanup, MCP Prompts, a plugin system, and a proper setup experience.

**Rebrand**
- **Renamed the project to Squadron.** npm package `@vladddev/mcp-agent-orchestrator` → `squadron-mcp`, CLI `agent-orchestra` → `squadron`, MCP server identity `agent-orchestrator` → `squadron`, default config filename `orchestrator-config.json` → `squadron-config.json`, env var `ORCHESTRATOR_STATE_DIR` → `SQUADRON_STATE_DIR`. See `docs/MIGRATION.md`. The GitHub repository path itself is unchanged.
- Fixed `DEFAULT_CONFIG.delegationRuntime` missing `executionMode`, which broke `npm run build`/`npm install` for every fresh clone.
- Moved AI-agent build-coordination docs (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX_START.md`, `PROJECT_STATUS.md`, `SYSTEM_CHECKUP.md`, `VERIFICATION_CHECKLIST.md`, `sprints/`, `.ai/`) and ~108 lines of accumulated per-sprint status notes previously appended to the bottom of README.md into `.internal/` — historical, not user-facing.
- Removed the committed npm-pack tarball and 13 accidentally-committed local dev `state/tasks/*.json` runtime logs (checked for secrets first — none found); fixed the `.gitignore` pattern that let the latter slip through (`state/*.json` didn't match nested `state/tasks/*.json`).
- Fixed `package.json`/README references pointing at the wrong GitHub org (`vladddev` instead of `DurdeuVlad`).

**Subprocess delegation**
- Added the `tests/integration/subprocess-delegation.test.ts` one-shot create→delegate→verify smoke test and `docs/troubleshooting-subprocess.md` — the feature itself (spawning real `claude`/`gemini`/`codex` subprocesses via `delegate_task`) was already fully implemented, this closes a test/docs gap.
- Documented that interactive terminal sessions are Windows-only today (no POSIX/macOS terminal spawner exists) — `executionMode: "auto"` silently falls back to one-shot subprocess elsewhere.

**MCP Prompts**
- Added MCP's formal Prompts capability (`prompts/list`/`prompts/get`, alongside Tools): `plan_delegation`, `review_report`, `track_workflow_status`, `optimize_tokens` — each teaches a connecting client when/how to use an existing tool.

**Plugins**
- Added a minimal plugin system (v1: local file paths only) — plugins can contribute tools, prompts, and templates via optional `registerTools`/`registerPrompts`/`registerTemplates` hooks, error-isolated per hook and per plugin so one broken plugin can't take down the server or another plugin. See `docs/plugins.md` and `examples/plugins/hello-plugin.js`.

**Setup**
- `squadron init` is now interactive by default in a terminal: shows real auth-detection status per agent (was previously hardcoded/fictional), confirms config/template paths, and offers to write the MCP client config snippet for you. `--yes` preserves the old non-interactive behavior for CI/scripted use.
- Consolidated the README's two conflicting Quick Start flows into one, and rewrote `docs/getting-started.md` (was stale "Sprint 001" content) as its deep-dive expansion.

## 0.1.0 - 2026-02-12

- Added core MCP server and orchestration tools (`create_task_spec`, `delegate_task`, `collect_report`, `review_output`, `track_workflow`, `optimize_tokens`).
- Added template loading/validation and workflow/task state management.
- Added config system, role boundary enforcement, token tracking, and quality gates.
- Added Sprint 005 production features:
  - CLI (`squadron`) with `init`, `task create`, `workflow track`, `metrics`, `dashboard`.
  - Dashboard server and web UI (`/api/workflows`, `/api/metrics`).
  - File-backed state persistence via `FileStorageAdapter`.
  - Additional docs, tests, and packaging assets.
