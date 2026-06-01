# CLI Reference

The package exposes `agent-orchestra` as a standalone command line interface.

## Commands

## `agent-orchestra init`

Initialize local config and runtime folders.

```bash
agent-orchestra init
agent-orchestra init --force --config custom-config.json --templates-dir ./templates
```

## `agent-orchestra task create`

Create a task spec from a template and persist it in state storage.

```bash
agent-orchestra task create \
  --task "Implement API retry logic" \
  --template typescript-feature \
  --executor gemini \
  --input feature="Implement API retry logic" \
  --input files='["src/api/client.ts"]'
```

Supported key/value options:
- `--context key=value`
- `--input key=value`

Values accept JSON when valid (numbers, arrays, objects, booleans) and otherwise fall back to strings.

## `agent-orchestra workflow track <workflowId>`

Show workflow status and progress summary.

```bash
agent-orchestra workflow track 3f3f3f3f-1234-5678-9012-abcdefabcdef
```

## `agent-orchestra metrics`

View aggregate token metrics for all workflows, or detailed metrics for a specific workflow.

```bash
agent-orchestra metrics
agent-orchestra metrics --workflow 3f3f3f3f-1234-5678-9012-abcdefabcdef
```

## `agent-orchestra dashboard`

Start the web dashboard server.

```bash
agent-orchestra dashboard --port 3000
```

Then open `http://localhost:3000`.
