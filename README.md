# MCP Agent Orchestrator

> **Model Context Protocol server for coordinating multi-agent AI workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## Why This Exists

If you're managing multiple AI agents (Claude for planning, Gemini for execution, etc.), you're probably:

- ✍️ **Writing the same coordination prompts repeatedly** (task specs, handoffs, reports)
- 💸 **Wasting tokens** on manual coordination overhead (250-500 tokens per handoff)
- 🔁 **Copy-pasting** task specifications and execution reports between agents
- 📊 **Tracking nothing** (no token metrics, workflow state, or optimization insights)
- 🚧 **Dealing with inconsistency** (manual enforcement of role boundaries)

**This MCP server solves all of that.**

## What It Does

MCP Agent Orchestrator provides **structured primitives** for multi-agent coordination:

### Important Documents

- **[SYSTEM_CHECKUP.md](SYSTEM_CHECKUP.md)** ⭐ - **READ THIS FIRST** - Comprehensive analysis of how current system works vs. how new system will work. Confirms all features preserved + massive improvements.
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current status, sprint plans, and implementation roadmap
- [CODEX_START.md](CODEX_START.md) - Onboarding guide for Codex (execution specialist)

### Quick Start

```bash
# Install dependencies
npm install

# If you're already logged in globally (can run `claude`, `gemini`, `codex` in terminal):
# → You're done! No configuration needed. Just run:
npm run dev

# If NOT logged in globally, configure agents:
cp .env.example .env
# Add your API keys to .env (see .env.example for options)

# Run the server
npm run dev
```

**Already logged in globally?** The orchestrator auto-detects your existing CLI login sessions. See [Global Auth Quick Start](docs/QUICK_START_GLOBAL_AUTH.md).

### Core Capabilities

- **🎯 YOLO Mode** - Full autonomy with auto-approval of all gates (default: ON)
- **💳 Credit Management** - Automatic agent fallback when credits exhausted (Claude → Codex, Gemini → Codex)
- **📋 Task Spec Generation** - Auto-generate structured task specifications from high-level descriptions
- **🔄 Agent Handoffs** - Automated delegation with context passing and role enforcement
- **📊 Execution Reports** - Structured report collection from executor agents
- **✅ Review Workflows** - Quality control gates with configurable criteria
- **📈 Token Tracking** - Real-time token usage monitoring and optimization metrics
- **🗂️ State Management** - Multi-step workflow tracking with persistence
- **🎯 Template System** - Reusable coordination patterns including user's complete workflow
- **🧠 Auto-Orchestration** - AI automatically detects when to trigger workflows vs answer directly
- **🔍 AI Quality Assurance** - Context-aware QA prompts injected automatically (code, docs, configs)
- **⚡ Role Boundaries** - Enforced agent capabilities (Claude = planning, Gemini = execution, Codex = fallback)

### Token Savings

**Before orchestration:**
```
User → Claude: "Generate debate on AI ethics"
Claude writes 250-token task spec manually
User copies task spec to Gemini context
Gemini executes and writes 400-token report
User copies report back to Claude
Claude reviews and responds
Total: ~800 tokens of coordination overhead
```

**With orchestration:**
```
User → Claude: "Generate debate on AI ethics"
Claude: orchestrator.create_task(...) → 50 tokens
orchestrator.delegate() → auto-handoff (0 Claude tokens)
Gemini executes → orchestrator.collect_report() → 50 tokens
Claude: orchestrator.review(...) → 50 tokens
Total: ~150 tokens (81% reduction!)
```

## Installation

### For Use in Your Projects

```bash
npm install -g @vladddev/mcp-agent-orchestrator
```

Or add to your MCP settings (`~/.config/claude/mcp.json`):

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "npx",
      "args": ["@vladddev/mcp-agent-orchestrator"]
    }
  }
}
```

### For Development

```bash
git clone https://github.com/vladddev/mcp-agent-orchestrator.git
cd mcp-agent-orchestrator
npm install
npm run build
```

## Quick Start

### 1. Configure Your Agents

Create `orchestrator-config.json` in your project root:

```json
{
  "agents": {
    "claude": {
      "role": "planner",
      "capabilities": ["planning", "editorial-review", "strategy"],
      "tokenBudget": 100000
    },
    "gemini": {
      "role": "executor",
      "capabilities": ["code-reading", "execution", "validation"],
      "tokenBudget": 1000000
    }
  },
  "templates": {
    "code-review": "templates/code-review.json",
    "debate-generation": "templates/debate-generation.json"
  }
}
```

### 2. Create a Task Template

`templates/code-review.json`:

```json
{
  "name": "code-review",
  "description": "Review code for quality, bugs, and best practices",
  "inputs": [
    { "name": "filePath", "type": "string", "required": true },
    { "name": "criteria", "type": "array", "default": ["quality", "bugs", "style"] }
  ],
  "executionSteps": [
    "Read the code file",
    "Analyze against criteria",
    "Identify issues and improvements",
    "Generate structured report"
  ],
  "successCriteria": [
    "All criteria evaluated",
    "Actionable recommendations provided"
  ]
}
```

### 3. Use in Your Workflow

**In Claude Code / VS Code:**

```
User: "Review src/api/handlers.ts for bugs and performance"

Claude (using MCP tools):
orchestrator.create_task_spec({
  task: "Review src/api/handlers.ts",
  executor: "gemini",
  template: "code-review",
  context: { criteria: ["bugs", "performance"] }
})

orchestrator.delegate_task({
  taskId: "task-123",
  executor: "gemini"
})

[Gemini executes in background]

orchestrator.collect_report({
  taskId: "task-123"
})

Claude: [Reviews report and responds to user]
```

**Result:** Same workflow, 80% less coordination overhead.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Orchestrator Server                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Task Manager │  │ State Store  │  │Template Engine│   │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              MCP Tools (exposed to agents)          │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ • create_task_spec  • delegate_task                 │  │
│  │ • collect_report    • review_output                 │  │
│  │ • track_workflow    • optimize_tokens               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │                                      │
    ┌────┴────┐                            ┌───┴────┐
    │ Claude  │                            │ Gemini │
    │(Planner)│                            │(Executor)│
    └─────────┘                            └────────┘
```

## MCP Tools Reference

### `create_task_spec`

Generate structured task specification for executor agent.

**Input:**
```typescript
{
  task: string;           // High-level task description
  executor: string;       // Target agent (e.g., "gemini")
  template: string;       // Template name (e.g., "code-review")
  context?: object;       // Additional context (files, constraints, etc.)
}
```

**Output:** Task specification with ID, inputs, steps, success criteria

---

### `delegate_task`

Handoff task to executor agent with auto-formatting.

**Input:**
```typescript
{
  taskId: string;    // Task ID from create_task_spec
  executor: string;  // Executor agent name
}
```

**Output:** Delegation confirmation and executor notification

---

### `collect_report`

Gather execution results from executor agent.

**Input:**
```typescript
{
  taskId: string;  // Task ID to collect report for
}
```

**Output:** Structured execution report with results, metrics, recommendations

---

### `review_output`

Trigger review workflow with quality criteria.

**Input:**
```typescript
{
  taskId: string;
  criteria: string[];  // E.g., ["quality", "completeness", "style"]
  reviewer: string;    // Reviewer agent (e.g., "claude")
}
```

**Output:** Review summary with pass/fail and recommendations

---

### `track_workflow`

Monitor multi-step coordination progress and token usage.

**Input:**
```typescript
{
  workflowId: string;  // Workflow ID to track
}
```

**Output:** Workflow state, task progress, token metrics

---

### `optimize_tokens`

Analyze coordination patterns and suggest optimizations.

**Input:**
```typescript
{
  workflowId?: string;  // Optional: analyze specific workflow
  timeRange?: string;   // Optional: "last-24h", "last-week"
}
```

**Output:** Token usage analysis, optimization recommendations, potential savings

## Templates

Templates define reusable coordination patterns. Included templates:

- **code-review** - Review code for quality, bugs, performance
- **debate-generation** - Generate AI debates with validation
- **video-rendering** - Coordinate video generation pipelines
- **sprint-planning** - Plan multi-task sprints with dependencies
- **quality-check** - Run QC checks on outputs

Create custom templates in `templates/` directory. See [Template Guide](docs/templates.md).

## Configuration

### Agent Configuration

Define agents, roles, and capabilities in `orchestrator-config.json`:

```json
{
  "agents": {
    "agent-name": {
      "role": "planner|executor|reviewer",
      "capabilities": ["list", "of", "capabilities"],
      "tokenBudget": 100000,
      "costPerToken": 0.000015
    }
  }
}
```

### Role Boundaries

Enforce what agents can/cannot do:

```json
{
  "roleBoundaries": {
    "enforce": true,
    "rules": [
      "claude may not read code files (delegate to gemini)",
      "gemini may not make editorial decisions (defer to claude)"
    ]
  }
}
```

### Token Optimization

Configure token tracking and optimization:

```json
{
  "tokenOptimization": {
    "enabled": true,
    "savingsTarget": 0.5,  // Target 50% reduction
    "reportSavings": true,
    "alertThreshold": 1000  // Alert if task exceeds 1000 tokens
  }
}
```

## Use Cases

### 1. Code Generation Workflow

```
Claude → Plans feature → Creates task spec
Gemini → Reads codebase → Implements feature → Runs tests → Reports back
Claude → Reviews code → Approves or requests changes
```

**Token Savings:** 60-80% (Claude doesn't read code files)

---

### 2. Content Creation Pipeline

```
Claude → Plans content strategy → Creates batch tasks
Gemini → Generates content → Validates quality → Creates outputs
Claude → Editorial review → Approves for publication
```

**Token Savings:** 70-85% (batch operations + no context duplication)

---

### 3. Multi-Step Refactoring

```
Claude → Analyzes architecture → Plans refactor → Creates sprint
Gemini → Executes tasks sequentially → Validates each step
Claude → Reviews progress → Adjusts plan as needed
```

**Token Savings:** 50-70% (state management reduces re-explanation)

## Metrics & Observability

Track coordination efficiency:

- **Token Usage** - Per-agent, per-task, per-workflow
- **Time Savings** - Coordination time vs. manual handoffs
- **Quality Metrics** - Pass rates, revision rates
- **Cost Tracking** - Token costs by agent × task type

Export metrics to CSV/JSON for analysis:

```bash
agent-orchestra metrics export --format csv --output metrics.csv
```

## Development

### Project Structure

```
mcp-agent-orchestrator/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── cli.ts                # CLI for standalone usage
│   ├── tools/                # MCP tool implementations
│   ├── templates/            # Template system
│   ├── state/                # State management
│   └── utils/                # Utilities
├── templates/                # Built-in templates
├── tests/                    # Test suites
├── examples/                 # Example workflows
├── docs/                     # Documentation
└── sprints/                  # Development sprints
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Building

```bash
npm run build         # TypeScript → dist/
npm run watch         # Watch mode
```

### Linting & Formatting

```bash
npm run lint          # ESLint
npm run format        # Prettier
```

## Roadmap

**Phase 1 (Sprint 1-2):** Core MCP server + basic tools  
**Phase 2 (Sprint 3):** State management + token tracking  
**Phase 3 (Sprint 4):** Templates + role boundaries  
**Phase 4 (Sprint 5):** CLI + observability dashboard  
**Phase 5 (Future):** Multi-agent (>2), parallel execution, CI/CD integration

See [sprints/](sprints/) for detailed planning.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © 2026 Vlad Durdeu

## Related Projects

This orchestrator extracts patterns from:
- [automated-ai-debates-content-farm](https://github.com/vladddev/automated-ai-debates-content-farm) - Debate generation with Claude/Gemini
- [night_pass_sleep_app](https://github.com/vladddev/night_pass_sleep_app) - Flutter mobile app with production-grade agent coordination
- [desktop-ai-poc-modules](https://github.com/vladddev/desktop-ai-poc-modules) - Desktop automation monorepo

## Questions?

- 📧 Email: [your-email]
- 🐛 Issues: [GitHub Issues](https://github.com/vladddev/mcp-agent-orchestrator/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/vladddev/mcp-agent-orchestrator/discussions)

---

**Built with ❤️ for efficient multi-agent workflows**

## Sprint 001 Status

Sprint 001 delivers a working MCP server foundation with stdio transport, tool registration, and Vitest coverage.

Implemented tools:
- `ping`
- `create_task_spec`
- `delegate_task`
- `collect_report`

Verification commands:
```bash
npm run build
npm test
npm run lint
npm run dev
```

See `docs/getting-started.md` for setup and connection details.

## Sprint 002 Status

Sprint 002 is implemented with:
- Template schemas and loader/registry (`src/templates/types.ts`, `src/templates/loader.ts`)
- In-memory orchestration state manager (`src/state/types.ts`, `src/state/state-manager.ts`)
- Built-in templates expanded to 6 files including `debate-generation`, `documentation`, and `typescript-test`
- Tool integration: `create_task_spec`, `delegate_task`, and `collect_report` now persist and update orchestration state

See:
- `docs/templates.md`
- `docs/state-management.md`
- `examples/template-usage.ts`

## Sprint 003 Status

Sprint 003 core orchestration tools are implemented and registered:
- `create_task_spec`
- `delegate_task`
- `collect_report`
- `review_output`
- `track_workflow`

End-to-end workflow is covered by tests in `tests/tools/orchestration-workflow.test.ts` and runnable example script `examples/orchestration-workflow.ts`.

## Sprint 004 Status

Sprint 004 is implemented with:
- Config system (`src/config/types.ts`, `src/config/loader.ts`)
- Role boundary enforcement (`src/enforcement/role-enforcer.ts`)
- Token tracking and analytics (`src/metrics/token-tracker.ts`, `src/tools/optimize-tokens.ts`)
- Quality gates integrated into `collect_report` (`src/quality/gates.ts`)

Additional docs:
- `docs/configuration.md`
- `docs/role-boundaries.md`
- `docs/token-optimization.md`

## Sprint 005 Status

Sprint 005 is implemented with:
- Standalone CLI (`src/cli.ts`) with commands:
  - `init`
  - `task create`
  - `workflow track`
  - `metrics`
  - `dashboard`
- Dashboard server and API (`src/dashboard/server.ts`)
- Dashboard web UI (`src/dashboard/public/index.html`, `src/dashboard/public/app.js`)
- Persistent state storage:
  - `src/state/storage-adapter.ts`
  - `src/state/file-storage-adapter.ts`
- Packaging hardening for npm (`.npmignore`, `LICENSE`, `CHANGELOG.md`, `package.json files`)

Additional docs:
- `docs/cli.md`
- `docs/dashboard.md`

## Sprint 006 Status

Sprint 006 is implemented with:
- Intent classification and recommendations:
  - `src/tools/classify-intent.ts`
  - `src/config/classification-rules.ts`
  - `src/config/classification-rules.json`
- Workflow parameter extraction:
  - `src/tools/extract-workflow-params.ts`
- Context-aware decision support:
  - `src/tools/detect-context.ts`
  - `src/config/context-rules.ts`
  - `src/config/context-rules.json`
- Intelligent auto-orchestration:
  - `src/tools/auto-orchestrate.ts`
  - `src/config/auto-trigger-config.ts`
- Progress and UX formatting:
  - `src/tools/progress-reporter.ts`
  - `src/utils/message-formatter.ts`

Additional docs/examples:
- `docs/AUTO_ORCHESTRATION.md`
- `examples/auto-orchestration-examples.md`

Additional tests:
- `tests/tools/classify-intent.test.ts`
- `tests/tools/extract-workflow-params.test.ts`
- `tests/tools/detect-context.test.ts`
- `tests/tools/auto-orchestrate.test.ts`
- `tests/tools/progress-reporter.test.ts`
- `tests/integration/auto-orchestration.test.ts`
