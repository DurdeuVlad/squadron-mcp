# AGENTS.md - Agent Coordination Framework

> **Last Updated:** 2026-02-12  
> **Extracted From:** automated-ai-debates-content-farm, night_pass_sleep_app, desktop-ai-poc-modules

This document defines clear roles, coordination protocols, and token optimization strategies for multi-agent workflows in MCP Agent Orchestrator development. This is both the **development guide** (how to build this) and the **product spec** (what this orchestrator will enable).

## Agent Roles

### Claude (Planning Mastermind)

**In This Project:**
- Design orchestrator architecture and API
- Create sprint plans with task breakdowns
- Define coordination protocols and templates
- Review generated code for correctness and patterns
- Make high-level decisions about features and priorities

**In Projects Using This Orchestrator:**
- Plan projects and create task specifications
- Review executor output for quality
- Make editorial and strategic decisions
- Use orchestrator tools to delegate execution

**NOT Responsible For:**
- Reading large code files (delegate to Gemini - saves 1500+ tokens per file)
- Executing generation scripts or tool implementations
- Running validation checks or quality tests
- Creating test outputs or debugging runtime issues

**Token Optimization:**
Claude's token window is expensive. Avoid reading code files directly. Use Gemini for execution and code reading, Claude for planning and review.

---

### Gemini (Execution Specialist)

**In This Project:**
- Read and implement all TypeScript code for MCP server
- Execute test suites and validation checks
- Create example workflows and templates
- Diagnose and fix runtime errors
- Report back with structured findings

**In Projects Using This Orchestrator:**
- Execute tasks created by Claude via orchestrator
- Read code files and analyze implementations
- Run scripts, tests, and validations
- Generate structured reports for Claude review

**NOT Responsible For:**
- High-level architecture decisions (defer to Claude)
- Editorial or strategic decisions
- Publishing or deployment decisions (Claude approves first)

**Execution Protocol:**
1. Receive task spec from orchestrator or Claude
2. Read all required code files and context
3. Execute task following specified steps
4. Run validation checks
5. Generate structured report with results, metrics, recommendations
6. Report back via orchestrator or directly to Claude

---

## Coordination Protocols

### Task Handoff Template (Claude → Gemini)

```markdown
**Task:** [Brief description]

**Context:** [Why this is needed, how it fits broader goals]

**Inputs:**
- Files: [List files to read]
- Config: [Config files or settings]
- Constraints: [Requirements, limitations]

**Execution Steps:**
1. [Step 1]
2. [Step 2]
3. [...]

**Expected Outputs:**
- [Output 1]
- [Output 2]
- [...]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]
- [...]
```

### Execution Report Template (Gemini → Claude)

```markdown
**Task Completed:** [Task name]

**Results:**
✅ [Success 1]
✅ [Success 2]
⚠️ [Warning or issue, if any]

**Outputs Created:**
- [File or artifact 1]
- [File or artifact 2]
- [...]

**Quality Metrics:**
- [Metric 1]: [Value] [Pass/Fail]
- [Metric 2]: [Value] [Pass/Fail]

**Excerpt/Preview:**
[Key output preview or code snippet]

**Next Steps:**
- [Recommendation 1]
- [Recommendation 2]

**Estimated Time:** [Duration]
```

---

## Token Optimization Strategy

### Problem
Multi-agent coordination requires significant token overhead:
- Manual task specs: 250-500 tokens
- Manual reports: 400-600 tokens
- Context duplication: 200-400 tokens
- **Total: 850-1500 tokens per handoff**

### Solution
**This orchestrator reduces coordination to tool calls:**
- `create_task_spec`: 50-100 tokens
- `delegate_task`: Auto (0 tokens for planner)
- `collect_report`: 50-100 tokens
- **Total: 100-200 tokens per handoff (80-85% reduction)**

### Example: Code Review Workflow

**WITHOUT orchestrator:**
1. Claude writes task spec: 300 tokens
2. User copies to Gemini context
3. Gemini executes and writes report: 500 tokens
4. User copies back to Claude
5. Claude reviews: 200 tokens
**Total: 1000 tokens**

**WITH orchestrator:**
1. Claude: `orchestrator.create_task_spec(...)` → 50 tokens
2. `orchestrator.delegate_task(...)` → auto-handoff
3. Gemini executes (no Claude tokens)
4. `orchestrator.collect_report(...)` → 80 tokens
5. Claude reviews: 100 tokens
**Total: 230 tokens (77% savings)**

---

## Extracted Patterns from Reference Repos

### From automated-ai-debates-content-farm

**Patterns:**
- Task specs for content generation (debates, videos)
- Quality control gates (validation before review)
- Sprint coordination (5+ related tasks)
- Token tracking (69% savings via delegation)

**Templates to Create:**
- `debate-generation.json`
- `video-rendering.json`
- `quality-check.json`
- `sprint-planning.json`

---

### From night_pass_sleep_app

**Patterns:**
- Production-grade quality standards
- Device verification mandate (nothing works until proven)
- Glass box principle (transparency to users)
- Official documentation as authority
- Background work maximization

**Templates to Create:**
- `flutter-feature.json` (mobile development)
- `production-qa.json` (device testing protocol)
- `code-review.json` (with official docs check)

---

### From desktop-ai-poc-modules

**Patterns:**
- Monorepo module coordination
- Quality gate enforcement (check → fix → document → commit)
- Roleplay gate (personas before planning)
- Context routing (smart file loading)
- No root clutter (strict file organization)

**Templates to Create:**
- `module-integration.json` (cross-module work)
- `quality-gate.json` (automated checks)
- `documentation-update.json`

---

## Workflow Patterns

### Pattern 1: Single Task Execution

```
User → Claude: "Implement feature X"
Claude → Orchestrator: create_task_spec(...)
Orchestrator → Gemini: [formatted task]
Gemini → Executes task
Gemini → Orchestrator: execution_report
Orchestrator → Claude: [structured report]
Claude → User: [review + response]
```

**Token Savings:** 60-80%

---

### Pattern 2: Batch Tasks (Sprint)

```
User → Claude: "Plan and implement feature set Y"
Claude → Orchestrator: create_workflow([task1, task2, task3])
Orchestrator → Tracks multi-step execution
Gemini → Executes tasks sequentially
Orchestrator → Aggregates progress
Claude → Reviews milestones
Claude → User: [consolidated status]
```

**Token Savings:** 70-85% (state management + batching)

---

### Pattern 3: Quality Gate Workflow

```
Gemini → Implements code
Gemini → Orchestrator: request_review(taskId, criteria)
Orchestrator → Claude: [formatted review request]
Claude → Reviews against criteria
Claude → Orchestrator: review_decision(approve|reject|revise)
Orchestrator → Gemini: [feedback if needed]
```

**Token Savings:** 50-70% (structured review protocol)

---

## Role Boundaries (Enforced by Orchestrator)

### What Planners Can Do
- Create task specifications
- Request execution by executors
- Review outputs and approve/reject
- Make strategic decisions
- Define quality criteria

### What Planners CANNOT Do
- Read large code files (must delegate)
- Execute scripts directly (must delegate)
- Bypass review gates

### What Executors Can Do
- Read code files and context
- Execute tasks and scripts
- Run validation checks
- Generate outputs and artifacts
- Report structured results

### What Executors CANNOT Do
- Make architectural decisions (defer to planner)
- Approve for production (planner reviews first)
- Modify workflow definitions

---

## Success Metrics

Track these to validate orchestrator value:

1. **Token Savings:** Target 50-80% reduction vs. manual coordination
2. **Time Savings:** Target 60-80% reduction in coordination time
3. **Consistency:** 100% adherence to templates and protocols
4. **Quality:** Reduction in revision rates (better task specs)
5. **Portability:** Deploy to 3+ projects within first month

---

## Sprint Overview

This orchestrator will be built in **5 sprints:**

1. **Sprint 1:** Core MCP server infrastructure + basic tools
2. **Sprint 2:** Template system + state management
3. **Sprint 3:** Token tracking + optimization analytics
4. **Sprint 4:** Role boundaries + quality gates
5. **Sprint 5:** CLI + dashboard + documentation

See [sprints/](sprints/) for detailed sprint plans.

---

## Common Coordination Scenarios

### Scenario: "I need to implement a feature"

**Manual (Before):**
1. Claude reads code files (1500 tokens)
2. Claude writes implementation plan (300 tokens)
3. User copies to Gemini
4. Gemini executes and reports (500 tokens)
5. User copies back to Claude
6. Claude reviews (200 tokens)
**Total: 2500 tokens, 10-15 minutes**

**Orchestrated (After):**
1. Claude: `create_task_spec(task, executor, template)` (50 tokens)
2. `delegate_task(...)` → auto-handoff
3. Gemini executes → `collect_report(...)` (80 tokens)
4. Claude reviews (150 tokens)
**Total: 280 tokens, 2-3 minutes (89% token savings, 80% time savings)**

---

### Scenario: "I need to plan a multi-step project"

**Manual (Before):**
1. Claude creates sprint plan manually (500 tokens)
2. Claude writes 5+ separate task specs (1500 tokens)
3. Sequential execution with manual handoffs (2000+ tokens total)
4. Progress tracking in separate document
**Total: 4000+ tokens, 30-45 minutes**

**Orchestrated (After):**
1. Claude: `create_workflow([tasks])` with sprint template (150 tokens)
2. `track_workflow(...)` → real-time progress (50 tokens per check)
3. Batch execution with automated handoffs
4. Aggregated reporting
**Total: 500 tokens, 5-10 minutes (87% token savings, 78% time savings)**

---

## Emergency Protocols

### If Orchestrator is Down
Fall back to manual coordination using templates in this file until orchestrator is restored.

### If Task Fails
1. Gemini attempts diagnosis and auto-fix
2. If unsuccessful, reports failure with diagnostics
3. Claude reviews and decides: retry with adjustments, escalate, or abandon

### If Quality Gate Fails
1. Executor gets structured feedback
2. Revises and resubmits
3. Max 3 revision cycles before escalation to Claude for decision

---

## Version History

- **v0.1.0 (2026-02-12):** Initial framework extracted from 3 reference repos

---

## Cross-References

- **CLAUDE.md** - Claude-specific coordination protocols
- **GEMINI.md** - Gemini execution protocols and quality checklists
- **sprints/** - Detailed sprint planning and task breakdowns
- **templates/** - Reusable task templates
- **docs/architecture/** - System architecture and design decisions
