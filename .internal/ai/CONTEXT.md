# Agent Context

## Project Overview

**Squadron** is a Model Context Protocol server that automates multi-agent AI coordination with token optimization.

**Current Phase:** Project scaffold complete, ready to begin Sprint 001

## Key Files

### Development Coordination
- **AGENTS.md** - Agent coordination framework (read this first!)
- **CLAUDE.md** - Planning mastermind protocols
- **GEMINI.md** - Execution specialist protocols
- **PROJECT_STATUS.md** - Current status and roadmap

### Sprint Planning
- **sprints/sprint-001-core-mcp-server/** - Current sprint (start here)
- **sprints/sprint-002-template-system/** - Next sprint
- **sprints/sprint-003-core-orchestration-tools/** - Sprint 3
- **sprints/sprint-004-config-boundaries-optimization/** - Sprint 4
- **sprints/sprint-005-cli-dashboard-production/** - Sprint 5

### Technical
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript configuration
- **README.md** - Public-facing documentation

## Quick Start for Agents

### For Claude (Planning)
1. Read CLAUDE.md for your protocols
2. Review current sprint: sprints/sprint-001-core-mcp-server/README.md
3. Create task specs for Gemini following templates in AGENTS.md
4. Review Gemini's reports and approve/revise

### For Gemini (Execution)
1. Read GEMINI.md for your protocols
2. Receive task specs from Claude
3. Execute tasks following specs
4. Report results using structured template
5. Wait for Claude's review

## Development Workflow

1. **Plan** (Claude) - Break sprint into tasks, create specs
2. **Execute** (Gemini) - Implement features, write tests
3. **Report** (Gemini) - Structured completion reports
4. **Review** (Claude) - Approve or request revisions
5. **Iterate** - Repeat until sprint complete

## Current Status

**Sprint:** 001 (Core MCP Server Infrastructure)
**Status:** Ready to Start
**Next Action:** Claude creates task spec for Task 1 (TypeScript Project Setup)

## Extracted Patterns

This orchestrator extracts coordination patterns from 3 reference repos:
- **automated-ai-debates-content-farm** - Debate generation, quality gates, token tracking
- **night_pass_sleep_app** - Production standards, testing protocols
- **desktop-ai-poc-modules** - Monorepo coordination, quality enforcement

See AGENTS.md for detailed pattern analysis.

## Token Budget

**Target Savings:** 50-80% reduction in coordination overhead

**Manual Coordination:** 850-1500 tokens per handoff
**With Orchestrator:** 100-200 tokens per handoff

This project will prove the value proposition by using these patterns to build itself efficiently.

## Related Resources

- Model Context Protocol: https://modelcontextprotocol.io/
- MCP SDK: https://github.com/modelcontextprotocol/sdk
- TypeScript: https://www.typescriptlang.org/
- Vitest: https://vitest.dev/
