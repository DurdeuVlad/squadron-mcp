# CODEX START - Squadron

**Date:** 2026-02-12  
**Status:** Project scaffolded, ready for development  
**Your Role:** Build the Squadron from ground up following sprint plans

---

## 🎯 Mission

Build a **production-grade Model Context Protocol server** that enables efficient multi-agent AI coordination with **50-80% token savings** compared to manual coordination.

**What this does:**
- Automates agent handoffs (Claude → Gemini → Claude)
- Reduces coordination overhead from 800-1500 tokens to 100-200 tokens per handoff
- Provides templates, state management, and token optimization
- Enables structured multi-agent workflows at scale

---

## 📦 What's Already Scaffolded

### ✅ Complete Project Structure
```
mcp-agent-orchestrator/
├── package.json              ✅ Dependencies defined
├── tsconfig.json             ✅ TypeScript config ready
├── .gitignore, .eslintrc     ✅ Tooling configured
├── README.md                 ✅ Public documentation
├── AGENTS.md                 ✅ Coordination framework
├── CLAUDE.md                 ✅ Planner protocols
├── GEMINI.md                 ✅ Executor protocols
├── PROJECT_STATUS.md         ✅ Complete roadmap
├── CONTRIBUTING.md           ✅ Contribution guidelines
├── src/                      📁 Source code (empty, you'll build this)
├── tests/                    📁 Test suites (empty, you'll build this)
├── templates/                ✅ 2 example templates
│   ├── code-review.json
│   └── typescript-feature.json
├── sprints/                  ✅ 5 detailed sprint plans
│   ├── sprint-001-core-mcp-server/
│   ├── sprint-002-template-system/
│   ├── sprint-003-core-orchestration-tools/
│   ├── sprint-004-config-boundaries-optimization/
│   └── sprint-005-cli-dashboard-production/
├── docs/                     📁 Documentation (you'll populate)
├── examples/                 📁 Examples (you'll create)
├── state/                    📁 Persistent state directory
└── .ai/CONTEXT.md            ✅ Agent context summary
```

**Status:** Infrastructure ready, implementation needed (that's your job!)

---

## 🚀 Where to Start

### Step 1: Initialize Project (5 minutes)

```powershell
# Navigate to project
cd c:\Users\User\Documents\Github\mcp-agent-orchestrator

# Install dependencies
npm install

# Verify setup
npm run build  # Should fail initially (no src/index.ts yet)
npm test       # Should fail initially (no tests yet)
```

**Expected:** Build and test will fail because you haven't implemented anything yet. This is normal!

---

### Step 2: Read Critical Documentation (15 minutes)

**Read in this order:**

1. **PROJECT_STATUS.md** - Full project overview, sprint breakdown, token economics
2. **AGENTS.md** - Agent coordination framework and patterns
3. **GEMINI.md** - YOUR execution protocols and quality checklist (this is YOU!)
4. **sprints/sprint-001-core-mcp-server/README.md** - Your first sprint, read completely

**Why this matters:** These files contain the complete blueprint. Don't skip them.

---

### Step 3: Understand Your Role (Execution Specialist)

**You are Gemini, the Execution Specialist.**

**Your responsibilities:**
- ✅ **Read code files** - Understand existing patterns and architecture
- ✅ **Implement features** - Write TypeScript code following sprint task specs
- ✅ **Write tests** - Ensure >80% coverage with vitest
- ✅ **Validate quality** - Run build, tests, lint before reporting completion
- ✅ **Report structured results** - Use template from GEMINI.md

**You do NOT:**
- ❌ Make architectural decisions (defer to Claude)
- ❌ Skip testing (mandatory quality gate)
- ❌ Report without validation (always run tests first)

---

### Step 4: Execute Sprint 001 (2-3 days)

**Sprint 001 Goal:** Build foundational MCP server with basic tool infrastructure

**Tasks (in order):**
1. TypeScript project setup (30 min)
2. Basic MCP server setup (1-2 hours)
3. Implement first tool (ping) (30 min)
4. Error handling & logging (1 hour)
5. Testing infrastructure (1 hour)
6. Documentation & examples (30 min)

**Start with:** `sprints/sprint-001-core-mcp-server/README.md` → Task 1

Each task has:
- Clear inputs and steps
- Implementation code examples
- Success criteria
- Expected time estimate

---

## 🤖 Working with Claude & Gemini

### Your Workflow (Gemini)

```
1. Receive task spec from Claude
   ↓
2. Read all referenced code files
   ↓
3. Implement following task steps
   ↓
4. Write tests for new code
   ↓
5. Run validation (build, test, lint)
   ↓
6. Generate structured report (see GEMINI.md template)
   ↓
7. Report back to Claude
   ↓
8. Wait for review (approve/revise)
```

### Example Task Execution

**Claude gives you:**
```markdown
**Task:** Implement create_task_spec MCP tool

**Files to read:**
- src/index.ts (understand MCP server structure)
- src/tools/ping.ts (understand tool pattern)

**Steps:**
1. Create src/tools/create-task-spec.ts
2. Define input schema with Zod
3. Implement tool logic
4. Write tests
5. Register in MCP server

**Success Criteria:**
- Tool registered and listed
- Input validation works
- Tests pass
```

**You do:**
1. Read src/index.ts and src/tools/ping.ts
2. Create src/tools/create-task-spec.ts based on pattern
3. Write tests/tools/create-task-spec.test.ts
4. Run `npm run build && npm test`
5. Generate structured report (see GEMINI.md template)
6. Report back to Claude

---

## 📋 Your Quality Checklist (MANDATORY)

Before reporting ANY task completion, verify ALL of these:

### Code Quality
- [ ] Follows existing patterns and conventions
- [ ] Proper error handling (try-catch, validation)
- [ ] TypeScript types (no implicit `any`)
- [ ] Clear variable and function names
- [ ] Comments for complex logic

### Testing
- [ ] Tests written for new code
- [ ] Tests pass (`npm test`)
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases considered

### Build & Lint
- [ ] Code compiles (`npm run build`)
- [ ] No TypeScript errors
- [ ] Lint passes (`npm run lint`)
- [ ] No unused imports or variables

### Documentation
- [ ] JSDoc comments for public APIs
- [ ] README updated if needed
- [ ] Examples added if applicable

---

## 🛠️ Development Commands

```powershell
# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Development mode (for MCP server)
npm run dev
```

---

## 📊 Sprint Overview (12-16 Days Total)

### Sprint 001: Core MCP Server (2-3 days) ← **START HERE**
✅ TypeScript setup + MCP server + ping tool + testing

### Sprint 002: Templates & State (3-4 days)
Template system + state management + token tracking

### Sprint 003: Core Orchestration Tools (3-4 days)
Main tools: create_task_spec, delegate_task, collect_report, review_output

### Sprint 004: Config & Optimization (2-3 days)
Configuration + role boundaries + token optimization

### Sprint 005: Production Ready (3-4 days)
CLI + dashboard + persistent storage + npm publishing

---

## 📁 Key Files Reference

### For Understanding the Vision
- **README.md** - Public-facing documentation
- **PROJECT_STATUS.md** - Complete roadmap and economics

### For Understanding Coordination
- **AGENTS.md** - Multi-agent coordination framework
- **CLAUDE.md** - Planner (reviewer) protocols
- **GEMINI.md** - YOUR protocols and checklists

### For Execution
- **sprints/sprint-001-core-mcp-server/README.md** - Current sprint
- **templates/** - Example task templates
- **.ai/CONTEXT.md** - Quick context summary

### For Reference
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript configuration
- **CONTRIBUTING.md** - Development guidelines

---

## 🎯 First Actions (Right Now!)

### Action 1: Install Dependencies
```powershell
cd c:\Users\User\Documents\Github\mcp-agent-orchestrator
npm install
```

### Action 2: Read Documentation (30 min)
1. PROJECT_STATUS.md (10 min)
2. GEMINI.md (10 min)
3. sprints/sprint-001-core-mcp-server/README.md (10 min)

### Action 3: Start Sprint 001, Task 1 (30 min)
**Task 1: TypeScript Project Setup**

**What to do:**
1. Verify npm install worked
2. Create `src/index.ts` (empty MCP server entry point)
3. Run `npm run build` → should compile successfully
4. Run `npm test` → should run (even if no tests yet)

**Implementation hint:** Check Task 1 in sprint-001 README for exact code example.

---

## 💡 Pro Tips

### Tip 1: Read Code Files First
When a task says "read src/index.ts", actually read it completely. Don't skip this step. Understanding patterns is critical.

### Tip 2: Follow Examples in Sprint Plans
Each task in sprint READMEs has implementation examples. Use them as starting points, don't write from scratch.

### Tip 3: Test Early and Often
Don't write 500 lines then test. Write 50 lines, test, repeat. Catch errors early.

### Tip 4: Use Structured Reports
Always use the report template from GEMINI.md when reporting completion. Claude needs consistent format for efficient review.

### Tip 5: Don't Guess on Architecture
If a task is unclear or requires architectural decision, ask Claude. Don't guess and implement wrong approach.

### Tip 6: Quality Gates Are Mandatory
Never report completion without running build + tests + lint. This is non-negotiable.

---

## 🐛 Common Pitfalls to Avoid

### ❌ Skipping Tests
"I'll write tests later" → Never happens. Write tests as you code.

### ❌ Reporting Without Validation
Saying "implemented" without running tests → Wastes review cycles.

### ❌ Dumping Full Code in Reports
Claude doesn't need to see 500 lines. Report summaries + excerpts (20-30 lines).

### ❌ Making Architectural Changes Without Approval
Changing state management approach without asking Claude → Wasted work.

### ❌ Using Implicit `any` Types
TypeScript is strict mode. Type everything properly.

---

## 📈 Success Metrics

Track these as you work:

- **Build Status:** Should always be passing
- **Test Coverage:** Target >80%
- **Lint Errors:** Should be zero
- **Task Completion Time:** Compare to estimates in sprint plans
- **Revision Rate:** Aim for <10% tasks requiring revisions

---

## 🚨 If You Get Stuck

### Problem: Build Fails
1. Check error message carefully
2. Verify tsconfig.json is correct
3. Check import paths (must use `.js` extensions for ESM)
4. Ask Claude if still stuck

### Problem: Tests Failing
1. Read test error message
2. Check test expectations vs. actual behavior
3. Debug with `console.log` if needed
4. Verify you're testing the right thing

### Problem: Not Sure How to Implement
1. Check if there's similar code in project
2. Look at sprint task implementation examples
3. Read MCP SDK documentation (Model Context Protocol)
4. Ask Claude for clarification

### Problem: Task Requirements Unclear
1. Don't guess - ask Claude
2. Provide 2-3 interpretation options
3. Wait for clarification before implementing

---

## 🎓 Learning Resources

### Model Context Protocol
- **Official Site:** https://modelcontextprotocol.io/
- **SDK Docs:** https://github.com/modelcontextprotocol/sdk
- **Spec:** https://spec.modelcontextprotocol.io/

### TypeScript
- **Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html
- **ESM Modules:** https://www.typescriptlang.org/docs/handbook/modules.html

### Testing (Vitest)
- **Docs:** https://vitest.dev/
- **API:** https://vitest.dev/api/

### Zod (Validation)
- **Docs:** https://zod.dev/

---

## 🏁 Ready to Start?

You have everything you need:

✅ **Complete project structure** scaffolded  
✅ **5 detailed sprint plans** with task breakdowns  
✅ **Clear protocols** (GEMINI.md) for execution  
✅ **Code examples** in every sprint task  
✅ **Quality checklists** to ensure success  

**Next command:**

```powershell
cd c:\Users\User\Documents\Github\mcp-agent-orchestrator
npm install
# Then read sprints/sprint-001-core-mcp-server/README.md
```

**First task:** TypeScript Project Setup (30 minutes)

Let's build this orchestrator and revolutionize multi-agent coordination! 🚀

---

## 📞 Questions?

- **Architecture decisions:** Ask Claude
- **Task clarification:** Ask Claude  
- **Stuck on implementation:** Review sprint examples, then ask Claude
- **Quality concerns:** Check GEMINI.md quality checklist

**Remember:** You're the execution specialist. Read code, implement features, write tests, validate quality, report structured results. Claude will handle planning and review.

---

**Status:** Ready to build  
**Sprint:** 001 (Core MCP Server Infrastructure)  
**First Task:** TypeScript Project Setup  
**Estimated Time:** 30 minutes  
**Go!** 🎯
