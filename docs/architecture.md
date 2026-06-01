# Architecture

The orchestrator is built around four layers:

1. `src/index.ts`: MCP server transport and request routing
2. `src/tools/*`: orchestration tool handlers and schemas
3. `src/state/*`: workflow/task state with pluggable storage adapters
4. `src/config/*`, `src/enforcement/*`, `src/metrics/*`, `src/quality/*`: policy and analytics

## Request Flow

1. MCP client invokes a tool.
2. Registry validates and dispatches request.
3. Tool updates state, applies enforcement/quality rules, and records token metrics.
4. Response returns structured JSON to client.

## Persistence

- Memory mode: in-process storage only.
- File mode: JSON-backed storage via `FileStorageAdapter`.
- SQLite mode: reserved and currently blocked with explicit runtime error.
