# Getting Started

This guide covers Sprint 001 setup for the core MCP server.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer

## Install

```bash
npm install
```

## Build and Test

```bash
npm run build
npm test
npm run lint
```

## Run the MCP Server

```bash
npm run dev
```

On startup, the server exposes these tools:

- `ping`
- `create_task_spec`
- `delegate_task`
- `collect_report`

## Optional: Enable Real Subprocess Delegation

Add `delegationRuntime` in `orchestrator-config.json` to make `delegate_task` execute external CLIs:

```json
{
  "delegationRuntime": {
    "enabled": true
  }
}
```

With runtime enabled:
- `delegate_task` can execute `claude`, `gemini`, or `codex` subprocesses
- fallback to configured executor chain is supported
- report/state metadata are captured automatically

## Connect from GitHub Copilot / MCP Client

Use stdio transport pointing to:

```bash
node dist/index.js
```

If you are using an MCP inspector:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to the stdio server command above and call `listTools` / `callTool`.
