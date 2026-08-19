# CLI Reference

The package exposes `squadron` as a standalone command line interface.

## Commands

## `squadron init`

Initialize local config and runtime folders.

```bash
squadron init
squadron init --force --config custom-config.json --templates-dir ./templates
```

## `squadron task create`

Create a task spec from a template and persist it in state storage.

```bash
squadron task create \
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

## `squadron workflow track <workflowId>`

Show workflow status and progress summary.

```bash
squadron workflow track 3f3f3f3f-1234-5678-9012-abcdefabcdef
```

## `squadron metrics`

View aggregate token metrics for all workflows, or detailed metrics for a specific workflow.

```bash
squadron metrics
squadron metrics --workflow 3f3f3f3f-1234-5678-9012-abcdefabcdef
```

## `squadron dashboard`

Start the web dashboard server.

```bash
squadron dashboard --port 3000
```

Then open `http://localhost:3000`.
