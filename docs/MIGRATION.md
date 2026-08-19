# Migrating from `mcp-agent-orchestrator` to Squadron

This project was renamed. If you installed or configured it before this change, update the following:

| Old | New |
|---|---|
| npm package `@vladddev/mcp-agent-orchestrator` | `squadron-mcp` |
| CLI command `agent-orchestra` | `squadron` |
| MCP server identity (the key in your `mcpServers` config, and what shows up in client logs) | `squadron` |
| Default config filename `orchestrator-config.json` | `squadron-config.json` |
| Env var `ORCHESTRATOR_STATE_DIR` | `SQUADRON_STATE_DIR` |

## Steps

1. `npm uninstall -g @vladddev/mcp-agent-orchestrator && npm install -g squadron-mcp`
2. Rename your config file (`mv orchestrator-config.json squadron-config.json`), or pass `--config orchestrator-config.json` explicitly to keep the old filename.
3. Update your MCP client config (e.g. `~/.config/claude/mcp.json`): change the `mcpServers` key from `agent-orchestrator` to `squadron`, and `args` from `["@vladddev/mcp-agent-orchestrator"]` to `["squadron-mcp"]`.
4. If you set `ORCHESTRATOR_STATE_DIR` in your environment, rename it to `SQUADRON_STATE_DIR`.

No changes to task/workflow/template data formats — only names, so existing `state/` contents are unaffected.

The GitHub repository itself has **not** been renamed (still `DurdeuVlad/mcp-agent-orchestrator`) — only the npm package, CLI binary, and MCP server identity changed.
