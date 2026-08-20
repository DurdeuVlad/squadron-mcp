# Getting Started

This is the deep-dive expansion of the README's [Quick Start](../README.md#quick-start) — the same path, in more detail.

## Prerequisites

- Node.js 20 or newer
- npm 9 or newer
- At least one of `claude`, `gemini`, `codex` installed and authenticated (global CLI login, subscription token, or API key — see [Authentication](AUTHENTICATION.md))

## Install and set up

```bash
npm install -g squadron-mcp
squadron init
```

`squadron init` is interactive when run in a terminal: it shows you the auth-detection result for each agent (see [Global Auth Quick Start](QUICK_START_GLOBAL_AUTH.md)), lets you confirm or change the config file path and templates directory, writes `squadron-config.json`, creates `templates/`/`state/`, and offers to write the MCP client config snippet you'd add to e.g. `~/.config/claude/mcp.json`. Run `squadron init --yes` to skip the prompts and use flags/defaults only — useful in CI or scripted setups.

## For development (working on Squadron itself)

```bash
git clone https://github.com/DurdeuVlad/squadron-mcp.git
cd squadron-mcp
npm install
npm run build
npm test
npm run lint
npm run dev   # starts the MCP server directly via tsx, no build step
```

## Run the MCP server

```bash
squadron    # or, from a dev checkout: npm run dev
```

On startup the server registers its tools and [prompts](prompts.md) and logs an `auth.status` line to stderr. It exposes (as of this writing) eleven tools — `ping`, `create_task_spec`, `delegate_task`, `collect_report`, `review_output`, `track_workflow`, `optimize_tokens`, `classify_intent`, `extract_workflow_params`, `detect_context`, `auto_orchestrate` — see [Tools API](tools.md) for the full reference, plus four built-in prompts — see [Prompts API](prompts.md).

## Enable real subprocess delegation

`delegate_task` can either just format a handoff message (`executionMode: "handoff"`) or actually spawn `claude`/`gemini`/`codex` as a subprocess (`executionMode: "subprocess"`, or `"auto"` to let `delegationRuntime.enabled` decide). To turn this on by default, set in `squadron-config.json`:

```json
{
  "delegationRuntime": {
    "enabled": true
  }
}
```

With it enabled: `delegate_task` executes the configured CLI, walks the fallback-executor chain on failure, and captures execution metadata (exit code, duration, stdout/stderr) into task state automatically. See [Troubleshooting: subprocess delegation](troubleshooting-subprocess.md) if a run fails, and [Interactive Sessions](interactive-sessions.md) for the (Windows-only) persistent-terminal alternative.

## Extend with plugins

Add local tools/prompts/templates without forking — see [Plugins](plugins.md).

## Connect from an MCP client

Point your client at the `squadron` command (or `node dist/index.js` from a dev checkout) over stdio. `squadron init` prints the exact `mcpServers` JSON snippet to add to your client config.

To poke at it manually first:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to the `squadron` stdio command above and call `tools/list`, `tools/call`, `prompts/list`, `prompts/get`.
