# Squadron

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

Squadron provides **structured primitives** for multi-agent coordination:

### Quick Start

```bash
npm install -g squadron-mcp
squadron init
```

`squadron init` is interactive: it checks for existing `claude`/`gemini`/`codex` CLI logins (see [Authentication](docs/AUTHENTICATION.md)), writes `squadron-config.json`, creates the `templates/`/`state/` directories, and offers to write the MCP client config snippet for you. Run with `--yes` to skip the prompts and use flag/defaults only (e.g. in CI).

Then add Squadron to your MCP client (e.g. `~/.config/claude/mcp.json`) using the snippet the wizard printed, or see [Installation](#installation) below.

<details>
<summary>Advanced: manual configuration (no wizard)</summary>

Create `squadron-config.json` in your project root:

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

Create a task template, e.g. `templates/code-review.json`:

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

Then, from your MCP client (e.g. Claude Code / VS Code):

```
User: "Review src/api/handlers.ts for bugs and performance"

Claude (using MCP tools):
create_task_spec({
  task: "Review src/api/handlers.ts",
  executor: "gemini",
  template: "code-review",
  context: { criteria: ["bugs", "performance"] }
})

delegate_task({
  taskId: "task-123",
  executor: "gemini"
})

[Gemini executes]

collect_report({
  taskId: "task-123"
})

Claude: [Reviews report and responds to user]
```

</details>

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
Claude: create_task_spec(...) → 50 tokens
delegate_task(...) → auto-handoff (0 Claude tokens)
Gemini executes → collect_report(...) → 50 tokens
Claude: review_output(...) → 50 tokens
Total: ~150 tokens (81% reduction!)
```

## Installation

### For Use in Your Projects

```bash
npm install -g squadron-mcp
```

Or add to your MCP settings (`~/.config/claude/mcp.json`):

```json
{
  "mcpServers": {
    "squadron": {
      "command": "npx",
      "args": ["squadron-mcp"]
    }
  }
}
```

### For Development

```bash
git clone https://github.com/DurdeuVlad/mcp-agent-orchestrator.git
cd mcp-agent-orchestrator
npm install
npm run build
```

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

Define agents, roles, and capabilities in `squadron-config.json`:

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
squadron metrics export --format csv --output metrics.csv
```

## Development

### Project Structure

```
mcp-agent-orchestrator/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── cli.ts                # CLI for standalone usage
│   ├── tools/                # MCP tool implementations
│   ├── prompts/               # MCP prompt templates
│   ├── plugins/               # Plugin loading/application
│   ├── setup/                 # squadron init wizard, auth detection, client config
│   ├── templates/            # Template system
│   ├── state/                # State management
│   └── utils/                # Utilities
├── templates/                # Built-in templates
├── tests/                    # Test suites
├── examples/                 # Example workflows
├── docs/                     # Documentation
└── .internal/                 # AI-agent build-coordination history (not user docs)
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
- 🐛 Issues: [GitHub Issues](https://github.com/DurdeuVlad/mcp-agent-orchestrator/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/DurdeuVlad/mcp-agent-orchestrator/discussions)

---

**Built with ❤️ for efficient multi-agent workflows**

