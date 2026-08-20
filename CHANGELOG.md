# Changelog

## 0.3.0 - 2026-08-20

A live end-to-end test of real subprocess delegation surfaced a report-parsing bug and an unmeasured token-savings claim; fixing both honestly led to per-task model selection, task dependency tracking, and a named default orchestration pattern.

**Fixes**
- Fixed `normalizeExecutorReport` treating `claude --output-format json`'s own metadata envelope as the delegate's report — real summaries/outputs/issues and token usage were silently dropped for every real subprocess delegation to `claude`. Added envelope-aware token-usage fallback from the CLI's own `usage` fields when the delegate doesn't self-report.
- Removed the fabricated "81% token savings" claim: `savingsVsBaseline`/`savingsPercentage` were computed against a hardcoded, never-measured `baselinePerTask = 800` baked in from an illustrative example in an old sprint doc. Replaced with honest real-usage reporting (`totalTokens`, `avgTokensPerTask`, per-agent cost) across `TokenTracker`, the CLI, the dashboard, and `optimize_tokens`. Removed the now-dead `tokenOptimization.savingsTarget`/`reportSavings` config fields along with it.
- Reframed the README and docs around what subprocess delegation actually provides — time and automation across providers — instead of an unverified token-savings percentage.

**Features**
- Added per-task/per-agent model selection: `delegate_task` and `create_task_spec` accept an optional `model`, spliced into the real subprocess command via a per-agent `modelFlag` config (pre-configured for `claude` and `codex`, verified against their real `--help` output). Call-time `model` overrides a task-spec-time one; never applied to fallback attempts on a different provider.
- Added task dependency tracking: `create_task_spec` accepts `dependsOn` (task IDs that must be `completed` first); `delegate_task` refuses delegation with a clear error while any are unmet; `track_workflow` reports per-task `readiness` (`"ready"`/`"blocked"`). No autonomous scheduler — Squadron stays a passive MCP server, the connecting client decides what to delegate next.
- Documented Manager-Worker (planner-as-reviewer) as Squadron's default coordination pattern — already true with zero code changes, now named. See `docs/orchestration-patterns.md`.

**Repo**
- Renamed the GitHub repository from `DurdeuVlad/mcp-agent-orchestrator` to `DurdeuVlad/squadron-mcp`, completing the rename started in 0.2.0 (npm package, CLI, and MCP server identity already matched Squadron; the repo path was the last inconsistency). GitHub redirects the old URL automatically. See `docs/MIGRATION.md`.
- Enabled GitHub Discussions.

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
