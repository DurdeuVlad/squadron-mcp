# YOLO Mode & Credit Management - Features Documentation

## YOLO Mode (Default: ON)

### What It Means

**YOLO = You Only Live Once = Full Autonomy**

When YOLO mode is enabled:
- ✅ All approval gates **auto-approve**
- ✅ No manual intervention required
- ✅ Workflow executes start-to-finish autonomously
- ✅ Maximum speed and efficiency

### Configuration

```typescript
// Enable YOLO mode (default)
execute_workflow({
  goal: "implement feature",
  yoloMode: true  // or omit (defaults to true)
});

// Disable YOLO mode (require manual approvals)
execute_workflow({
  goal: "implement feature",
  yoloMode: false
});
```

### Environment Variable

```bash
# .env
YOLO_MODE=true    # Default: autonomous execution
YOLO_MODE=false   # Manual approval gates
```

### When to Use

**Use YOLO Mode (default) when:**
- You trust the workflow and templates
- You want maximum automation
- You're in "get things done" mode
- You've tested the workflow previously

**Disable YOLO Mode when:**
- First time running a workflow
- High-stakes changes (production deploys)
- You want to review each step
- Learning/debugging workflow behavior

---

## Authentication Methods

> **Canonical reference:** [Authentication](AUTHENTICATION.md) is the source of truth for auth methods and priority - this section is a summary in the context of credit management specifically; if the two ever disagree, that doc wins.

Squadron checks **three** authentication methods per agent, in priority order:

**1. Global CLI login (highest priority)**
- ✅ Zero configuration - detected automatically if you're already logged in to `claude`/`gemini`/`codex` on this machine
- ✅ No separate cost tracking here (uses whatever your existing login's terms are)
- 📝 Detected via `src/setup/auth-detection.ts`'s `detectAgentAuth()` (file-presence check, see [Global Auth Quick Start](QUICK_START_GLOBAL_AUTH.md))

**2. Subscription token**
- ✅ Higher limits (10x more tokens/day)
- ✅ No per-token cost (flat subscription fee)
- ✅ Better for production when project makes money
- 📝 Uses: `ANTHROPIC_SUBSCRIPTION_TOKEN`, `GOOGLE_SUBSCRIPTION_TOKEN`, `OPENAI_SUBSCRIPTION_TOKEN`

**3. API key (fallback)**
- ⚠️ Lower limits (standard usage tiers)
- 💰 Pay-per-use (charged per token)
- ✅ Good for development and testing
- 📝 Uses: `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`

### Authentication Priority

```
For each agent:
  1. Check for a global CLI login → Use if present 🌐
  2. If not, check for a subscription token → Use if present ✅
  3. If not, check for an API key → Use if present ⚠️
  4. If none → Agent unavailable ❌
```

### Configuration

```bash
# .env

# PREFERRED: Subscription auth (use when project makes money)
ANTHROPIC_SUBSCRIPTION_TOKEN=your-sub-token
GOOGLE_SUBSCRIPTION_TOKEN=your-sub-token
OPENAI_SUBSCRIPTION_TOKEN=your-sub-token

# FALLBACK: API key auth (use for development/testing)
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx

# The orchestrator automatically prefers subscription over API key
```

### Limits by Auth Method

| Agent | API Key Limit | Subscription Limit | Cost (API Key) | Cost (Subscription) |
|-------|---------------|--------------------|-----------------|--------------------|
| Claude | 1M tokens/day | 10M tokens/day | $15/M tokens | Flat fee (free per-token) |
| Gemini | 2M tokens/day | 20M tokens/day | $2.50/M tokens | Flat fee (free per-token) |
| Codex | 500k tokens/day | 5M tokens/day | $20/M tokens | Flat fee (free per-token) |

Global CLI login isn't in this table - it uses whatever limits/cost terms your existing `claude`/`gemini`/`codex` login already has, tracked by that CLI itself, not by Squadron.

### When to Use Each Method

**Use Subscription When:**
- ✅ Project is profitable
- ✅ High-volume usage expected (>1M tokens/day)
- ✅ Predictable costs preferred
- ✅ Need higher limits

**Use API Key When:**
- ✅ Development/testing phase
- ✅ Low-volume usage
- ✅ Pay-as-you-go preferred
- ✅ Not ready for subscription commitment

### Migration Path

```bash
# Phase 1: Development (API keys)
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx

# Phase 2: Project makes money (add subscriptions, keep API keys as fallback)
ANTHROPIC_SUBSCRIPTION_TOKEN=sub-token-xxx  # ← Add this
ANTHROPIC_API_KEY=sk-ant-xxx               # ← Keep as fallback

# Orchestrator automatically uses subscription, falls back to API key if subscription fails
```

---

## Credit Management & Automatic Fallback

### How It Works

The orchestrator tracks credits for all agents in real-time (respecting auth method limits):

```
Claude (Primary Planner)
├─ Auth method: Subscription (or API key fallback)
├─ Daily limit: 10M tokens (subscription) or 1M (API key)
├─ Cost: Free per-token (subscription) or $15/M (API key)
├─ Fallback agent: Codex
└─ Role: Planning, Review

Gemini (Primary Executor)  
├─ Auth method: Subscription (or API key fallback)
├─ Daily limit: 20M tokens (subscription) or 2M (API key)
├─ Cost: Free per-token (subscription) or $2.50/M (API key)
├─ Fallback agent: Codex
└─ Role: Execution

Codex (Universal Fallback)
├─ Auth method: Subscription (or API key fallback)
├─ Daily limit: 5M tokens (subscription) or 500k (API key)
├─ Cost: Free per-token (subscription) or $20/M (API key)
├─ Fallback agent: None (last resort)
└─ Role: Any (planner OR executor)
```

### Automatic Fallback Logic

**Scenario 1: Claude runs out of credits**
```
User: "Start workflow (needs planner)"
Orchestrator: 
  1. Check Claude credits → ❌ Exhausted
  2. Check Claude fallback → Codex
  3. Check Codex credits → ✅ Available
  4. Use Codex as planner
  5. Log: "⚠️  Claude exhausted, using Codex for planning"
```

**Scenario 2: Gemini runs out during task execution**
```
Workflow: Executing task 3 of 6
Orchestrator:
  1. Check Gemini credits → ❌ Exhausted
  2. Check Gemini fallback → Codex
  3. Check Codex credits → ✅ Available
  4. Switch to Codex for tasks 3-6
  5. Log: "⚠️  Gemini exhausted at task 3, using Codex"
```

**Scenario 3: All agents exhausted (rare)**
```
Orchestrator:
  1. Check all agents → ❌ All exhausted
  2. Log: "🚨 ALL AGENTS EXHAUSTED - Cannot continue"
  3. Save workflow state (can resume later)
  4. Exit gracefully with error report
```

### Configuration

# Auth method (determines limits and costs automatically)
ANTHROPIC_SUBSCRIPTION_TOKEN=xxx  # If present: 10M/day, free per-token
# OR
ANTHROPIC_API_KEY=sk-ant-xxx      # If no subscription: 1M/day, $15/M tokens

# Custom daily limits (optional override)
CLAUDE_DAILY_LIMIT=1000000        # 1M (API) or 10M (subscription)
GEMINI_DAILY_LIMIT=2000000        # 2M (API) or 20M (subscription)
CODEX_DAILY_LIMIT=500000          # 500k (API) or 5M (subscription)
CLAUDE_DAILY_LIMIT=1000000        # 1M tokens/day
GEMINI_DAILY_LIMIT=2000000        # 2M tokens/day
CODEX_DAILY_LIMIT=500000          # 500k tokens/day

AUTO_FALLBACK=true                # Enable automatic fallback (default: true)
```

### Starting Workflow (Best Available Planner)

```typescript
// User initiates workflow
// Orchestrator automatically selects best available planner

const plannerAgent = await agentManager.selectPlannerAgent();
// Returns: 'claude' if available, otherwise 'codex'

console.log(`Starting workflow with ${plannerAgent}`);

// Execute workflow
await executeWorkflowTool({
  goal: "your goal",
  yoloMode: true
});

// Orchestrator handles all credit checking and fallbacks
```

### Monitoring Credit Status

```typescript
// Get current credit status
const status = agentManager.getCreditStatus();

console.log(status);
// {
//   claude: { available: true, creditsRemaining: 850000, usageToday: 150000 },
//   gemini: { available: false, exhaustedAt: '2026-02-12T14:30:00Z' },
//   codex: { available: true, creditsRemaining: 450000, usageToday: 50000 }
// }
```

### Graceful Degradation

**What happens when agents fail:**

1. **Primary agent exhausted** → Automatic fallback to configured fallback agent
2. **Fallback agent exhausted** → Error with graceful state save
3. **Workflow paused** → State saved to disk (can resume when credits available)
4. **User notified** → Clear error message with credit status

**Benefits:**
- ✅ Workflows never fail silently
- ✅ Work is never lost (state saved)
- ✅ Clear visibility into credit usage
- ✅ Can resume workflows when credits available

---

## User's Standard Workflow Integration

### Built-In Template: `user-standard-workflow`

Your complete workflow is now a built-in template:

```json
{
  "name": "user-standard-workflow",
  "steps": [
    "requirements-definition",
    "check-requirements-complete",
    "internal-debate",
    "user-approval (YOLO: auto-approve)",
    "research-and-sprint-plan",
    "create-detailed-tasks",
    "check-sprint-complete",
    "execute-tasks-sequentially",
    "verify-task-completion",
    "check-sprint-complete-final",
    "final-qa-confirmation"
  ],
  "yoloMode": true,
  "autoInjectContext": true,
  "autoQA": true,
  "autoFallback": true
}
```

### Usage

```typescript
// Execute your complete workflow in ONE call
await executeWorkflowTool({
  goal: "implement format templates for debates",
  perspective: "video quality",
  taskCount: 6,
  yoloMode: true  // Default
});

// Orchestrator automatically:
// ✅ Defines requirements
// ✅ Validates completeness
// ✅ Runs internal debate
// ✅ Auto-approves (YOLO mode)
// ✅ Creates sprint plan with research
// ✅ Generates 6 detailed tasks
// ✅ Executes all tasks sequentially
// ✅ Runs QA at each step
// ✅ Auto-fixes issues
// ✅ Verifies completion
// ✅ Runs final QA
// ✅ Handles credit exhaustion automatically
// ✅ Tracks all state

// You: 6 lines (80 tokens)
// Manual: 50+ prompts (7,900+ tokens)
// Savings: 99% of your time
```

---

## Token Savings (Your Workflow)

### Without Orchestrator (Manual)
```
Step 1: Requirements → 300 tokens
Step 2: Check complete → 150 tokens
Step 3: Debate → 300 tokens
Step 4: Approval → 0 tokens (manual)
Step 5: Sprint plan → 500 tokens
Step 6: Detailed tasks → 1200 tokens (200×6)
Step 7: Check sprint → 200 tokens
Step 8: Execute tasks → 4800 tokens (800×6)
Step 9: Verify tasks → 300 tokens
Step 10: Check complete → 200 tokens
Step 11: Final QA → 300 tokens
───────────────────────────────
TOTAL: 7,950 tokens per sprint
```

### With Orchestrator (Automated)
```
Single executeWorkflowTool() call → 80 tokens
Server auto-injects context → 0 tokens (happens server-side)
Workflow executes autonomously → 0 tokens (YOLO mode)
QA runs automatically → 0 tokens
Credit fallback → 0 tokens (automatic)
───────────────────────────────
TOTAL: 80 tokens per sprint
```

**Savings: 99% reduction** (7,950 → 80 tokens)

---

## Environmental Configuration

### Complete .env Example

```bash
# Agent API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
OPENAI_API_KEY=sk-xxx

# YOLO Mode
YOLO_MODE=true                    # Auto-approve all gates

# Credit Management
AUTO_FALLBACK=true                # Auto-switch agents on exhaustion
CLAUDE_DAILY_LIMIT=1000000
GEMINI_DAILY_LIMIT=2000000
CODEX_DAILY_LIMIT=500000

# Auto-Inject Context
AGENTS_RULES_PATH=AGENTS.md
GEMINI_PROTOCOL_PATH=GEMINI.md
CLAUDE_PROTOCOL_PATH=CLAUDE.md
FOLDER_CONVENTIONS_PATH=.github/copilot-instructions.md

# Workflow Settings
AUTO_QA=true                      # Run QA at each step
AUTO_FIX=true                     # Auto-fix issues when possible
MAX_RETRY_ATTEMPTS=3

# Server
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

---

## Summary

**YOLO Mode:**
- ✅ Default: ON
- ✅ Auto-approves all gates
- ✅ Maximum automation
- ⚙️  Can disable per-workflow if needed

**Credit Management:**
- ✅ Real-time tracking for all agents
- ✅ Automatic fallback (Claude → Codex, Gemini → Codex)
- ✅ Graceful degradation on exhaustion
- ✅ User notified of fallbacks
- ✅ State saved if all agents exhausted

**User Workflow:**
- ✅ Built-in as template
- ✅ Single command executes entire flow
- ✅ 99% token savings
- ✅ Fully autonomous (YOLO mode)
- ✅ Handles credit issues automatically

**You literally run ONE command and the orchestrator does EVERYTHING.**
