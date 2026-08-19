# Sprint Planning - Squadron

This directory contains all sprint plans for the Squadron project.

---

## Sprint Overview

| Sprint | Name | Duration | Status | Priority |
|--------|------|----------|--------|----------|
| **001** | [Core MCP Server](sprint-001-core-mcp-server/) | 2-3 days | Completed | P0 |
| **002** | [Template System](sprint-002-template-system/) | 3-4 days | Completed | P0 |
| **003** | [Orchestration Tools](sprint-003-core-orchestration-tools/) | 3-4 days | Completed | P0 |
| **004** | [Config & Optimization](sprint-004-config-boundaries-optimization/) | 2-3 days | Completed | P1 |
| **005** | [CLI & Production](sprint-005-cli-dashboard-production/) | 3-4 days | Completed | P1 |
| **006** | [Auto-Orchestration](sprint-006-auto-orchestration/) | 5-6 days | Completed | P2 |
| **007** | [AI Quality Assurance](sprint-007-ai-quality-assurance/) | 3-4 days | Completed | P2 |
| **008** | [Subprocess Delegation](sprint-008-subprocess-delegation/) | 4-6 days | Planned | P0 |

**Total Estimated Time:** 25-34 days

---

## Sprint 001: Core MCP Server ⚡

**Goal:** Build fundamental MCP server infrastructure

**Duration:** 2-3 days

**Deliverables:**
- TypeScript project setup
- MCP SDK integration
- Basic tool registration system
- Connection with GitHub Copilot
- Testing infrastructure (Vitest)

**Why First:** Foundation for everything else

[View Sprint →](sprint-001-core-mcp-server/)

---

## Sprint 002: Template System & State Management 📋

**Goal:** Create reusable workflow templates

**Duration:** 3-4 days

**Deliverables:**
- Template type system and schemas
- Template loader and registry
- User's 11-step workflow as built-in template
- State management for tasks
- Token usage tracking

**Dependencies:** Sprint 001

[View Sprint →](sprint-002-template-system/)

---

## Sprint 003: Core Orchestration Tools 🎯

**Goal:** Implement coordination tools

**Duration:** 3-4 days

**Deliverables:**
- `create_task_spec` tool
- `delegate_task` tool
- `collect_report` tool
- `execute_workflow` tool (11-step automation)
- Agent selection with auto-fallback

**Dependencies:** Sprint 001, 002

[View Sprint →](sprint-003-core-orchestration-tools/)

---

## Sprint 004: Config & Optimization 🔧

**Goal:** Configuration system and token optimization

**Duration:** 2-3 days

**Deliverables:**
- YOLO mode (auto-approve all gates)
- Credit management (track usage, auto-fallback)
- 3-tier authentication (global CLI > subscription > API key)
- Context injection system (AGENTS.md, GEMINI.md, conventions)
- Token tracking and reporting

**Dependencies:** Sprint 003

[View Sprint →](sprint-004-config-boundaries-optimization/)

---

## Sprint 005: CLI, Dashboard & Production 🚀

**Goal:** Production readiness

**Duration:** 3-4 days

**Deliverables:**
- CLI for standalone usage (`squadron` command)
- Web dashboard for workflow monitoring
- Persistent storage for state and metrics
- Complete documentation and examples
- npm publishing preparation
- End-to-end testing

**Dependencies:** Sprint 004

[View Sprint →](sprint-005-cli-dashboard-production/)

---

## Sprint 006: Intelligent Auto-Orchestration 🧠

**Goal:** AI automatically detects when to trigger workflows

**Duration:** 5-6 days

**Deliverables:**
- Intent classification system (`classify_intent` tool)
- Workflow parameter extraction from natural language
- Auto-trigger logic with confidence thresholds
- Context-aware decision making (file/folder awareness)
- Confirmation flow for medium-confidence requests
- Progress reporting and UX polish

**Token Savings:** 83% reduction (1000 → 170 tokens per interaction)

**Dependencies:** Sprints 001-005 (full system operational)

[View Sprint →](sprint-006-auto-orchestration/)

---

## Sprint 007: Automatic AI Quality Assurance 🔍

**Goal:** Inject intelligent, context-aware QA prompts automatically

**Duration:** 3-4 days

**Deliverables:**
- QA prompt library (800+ lines, 50+ contexts)
- Context detection system (auto-detects code vs docs vs configs)
- Intelligent prompt injection based on file type
- Self-review system (agents review own work before reporting)
- Quality scoring and trend tracking
- Workflow integration (QA at 3 points: plan, tasks, execution)

**Impact:** 50% reduction in rework, comprehensive quality validation at every step

**Dependencies:** Sprints 001-006 (full system with workflows)

[View Sprint →](sprint-007-ai-quality-assurance/)

---

## Sprint 008: Real Subprocess Delegation

**Goal:** Execute delegated tasks through real external Claude/Gemini/Codex CLIs, not simulated handoffs

**Duration:** 4-6 days

**Deliverables:**
- Runtime config for CLI commands, args, timeouts, and fallback behavior
- Subprocess runner with stdout/stderr capture and deterministic error handling
- `delegate_task` execution mode that launches external agent CLIs
- Report normalization path from executor output to `collect_report`-compatible payload
- Fallback path when preferred executor fails or times out
- Integration and unit tests covering success/failure/timeout/fallback

**Dependencies:** Sprints 001-007

[View Sprint ->](sprint-008-subprocess-delegation/)

---

## Sprint Execution Order

### Phase 1: Foundation (Days 1-10)
1. **Sprint 001** - Core MCP server infrastructure
2. **Sprint 002** - Template system
3. **Sprint 003** - Orchestration tools

**Milestone:** Basic coordination workflows functional

---

### Phase 2: Production (Days 11-17)
4. **Sprint 004** - Config, YOLO mode, credit management
5. **Sprint 005** - CLI, dashboard, production prep

**Milestone:** Ready for npm publish and real-world use

---

### Phase 3: Intelligence (Days 18-28)
6. **Sprint 006** - Auto-orchestration with AI intent detection
7. **Sprint 007** - Automatic AI quality assurance
8. **Sprint 008** - Real subprocess delegation to external CLIs

**Milestone:** Fully autonomous workflow triggering with real executor process delegation

---

## Current Status

**Last Updated:** February 13, 2026

- **Completed:** 7/8 sprints
- **In Progress:** Sprint 008 planning
- **Next Up:** Sprint 008 implementation

---

## Token Savings Breakdown

### Manual Coordination (Current State)
```
User → Claude: "Implement X" (50 tokens)
User → Claude: "Create sprint plan" (20 tokens)
Claude → User: [Shows plan] (200 tokens)
User → Claude: "Execute task 1" (30 tokens)
... repeat for each task ...

Total per workflow: ~7,900 tokens
```

### With MCP Orchestration (After Sprint 005)
```
User → Copilot: "Implement X" (20 tokens)
Copilot calls: execute_workflow(goal="X") (50 tokens)
MCP runs internally (coordinator tokens, not user tokens)
Copilot → User: [Progress + result] (200 tokens)

Total per workflow: ~700 tokens
Savings: 91% (7,900 → 700 tokens)
```

### With Auto-Orchestration (After Sprint 006)
```
User → Copilot: "Implement X" (20 tokens)
Copilot calls: auto_orchestrate(message="Implement X") (50 tokens)
MCP auto-detects and runs workflow internally
Copilot → User: [Progress + result] (100 tokens)

Total per workflow: ~170 tokens
Savings: 98% (7,900 → 170 tokens)
```

---

## Success Criteria (Full Project)

- ✅ 90%+ token reduction vs. manual coordination
- ✅ <5% false positive rate for auto-orchestration
- ✅ <3 seconds to start workflow execution
- ✅ >80% test coverage across all sprints
- ✅ Works seamlessly with GitHub Copilot in VS Code
- ✅ Zero configuration needed (global CLI auth auto-detected)
- ✅ Clear progress reporting during execution
- ✅ Documentation comprehensive and easy to follow

---

## Getting Started

### For Codex (Execution Specialist)

1. Read [CODEX_START.md](../CODEX_START.md) for onboarding context
2. Use sprint folders for maintenance, verification, and enhancement tasks
3. Report back with structured completion notes and validation results
4. Run tests continuously (`npm test`)

### For Claude (Planning Mastermind)

1. Review sprint plans and adjust as needed
2. Provide strategic guidance to Codex
3. Review completed work for quality
4. Make architectural decisions
5. Update documentation

---

## Sprint File Structure

Each sprint folder contains:
```
sprint-XXX-name/
  README.md              # Detailed sprint plan
  SPRINT_SUMMARY.md      # Quick reference
  task-1-name.md         # Individual task specs
  task-2-name.md
  ...
```

---

## Notes

- Sprints can be executed in parallel where dependencies allow
- Token savings compound with each sprint
- Auto-orchestration (Sprint 006) is optional but highly valuable
- Real-world usage will inform tuning and improvements
- ML-based classification is future enhancement (post-Sprint 006)

---

## Questions?

See:
- [PROJECT_STATUS.md](../PROJECT_STATUS.md) - Overall project status
- [README.md](../README.md) - Project overview
- [AGENTS.md](../AGENTS.md) - Agent coordination patterns
