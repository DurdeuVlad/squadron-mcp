# Token Optimization

Squadron includes token tracking, savings analytics, and optimization recommendations.

## Components

- `TokenTracker` (`src/metrics/token-tracker.ts`)
- `optimize_tokens` tool (`src/tools/optimize-tokens.ts`)

## Metrics Tracked

- total tokens per workflow
- tokens by agent
- tokens by stage (`planning`, `execution`, `validation`, `reporting`)
- estimated cost from per-agent pricing
- savings vs baseline manual workflow model

## Tool Output

`optimize_tokens` returns:

- workflow-scoped or portfolio-scoped analysis
- token/cost report
- actionable recommendations (e.g. planner executing tasks, batching repeated templates)

## Quality Gate Interaction

`collect_report` integrates quality gates (`src/quality/gates.ts`) and can mark task status as failed when required checks fail. This improves optimization signal quality by reducing noisy "completed" states.
