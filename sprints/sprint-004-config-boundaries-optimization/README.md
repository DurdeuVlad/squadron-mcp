# Sprint 004: Configuration, Role Boundaries & Token Optimization

**Sprint Goal:** Implement configuration system, enforce role boundaries, and add token optimization analytics

**Duration:** 2-3 days (4-6 hours)

**Priority:** HIGH (enables production use and optimization)

---

## Problem Statement

For the orchestrator to be production-ready and portable across projects, we need:

1. **Configuration System** - Per-project configuration for agents, templates, policies
2. **Role Boundaries** - Enforce what agents can/cannot do (prevent token waste)
3. **Token Optimization** - Track, analyze, and recommend token savings
4. **Quality Gates** - Automated quality checks before task completion

---

## Tasks

### Task 1: Configuration System 📋
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Load and validate per-project orchestrator configuration

**Steps:**
1. Create src/config/types.ts (config schema)
2. Create src/config/loader.ts (config loader)
3. Define orchestrator-config.json schema
4. Implement config validation
5. Add config merging (defaults + project config)
6. Write tests

**Implementation:**
```typescript
// src/config/types.ts
import { z } from "zod";

export const AgentConfigSchema = z.object({
  role: z.enum(["planner", "executor", "reviewer"]),
  capabilities: z.array(z.string()),
  tokenBudget: z.number().positive().optional(),
  costPerToken: z.number().positive().optional(),
});

export const RoleBoundarySchema = z.object({
  enforce: z.boolean(),
  rules: z.array(z.string()),
});

export const TokenOptimizationSchema = z.object({
  enabled: z.boolean(),
  savingsTarget: z.number().min(0).max(1), // 0-1 (percentage)
  reportSavings: z.boolean(),
  alertThreshold: z.number().optional(),
});

export const OrchestratorConfigSchema = z.object({
  agents: z.record(AgentConfigSchema),
  templates: z.record(z.string()).optional(),
  roleBoundaries: RoleBoundarySchema.optional(),
  tokenOptimization: TokenOptimizationSchema.optional(),
  stateStorage: z.enum(["memory", "file", "sqlite"]).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type RoleBoundary = z.infer<typeof RoleBoundarySchema>;
export type TokenOptimization = z.infer<typeof TokenOptimizationSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;

// Default configuration
export const DEFAULT_CONFIG: OrchestratorConfig = {
  agents: {
    claude: {
      role: "planner",
      capabilities: ["planning", "review", "strategy"],
      tokenBudget: 100000,
      costPerToken: 0.000015,
    },
    gemini: {
      role: "executor",
      capabilities: ["code-reading", "execution", "validation"],
      tokenBudget: 1000000,
      costPerToken: 0.0000025,
    },
  },
  roleBoundaries: {
    enforce: true,
    rules: [
      "planner may not read code files >200 lines",
      "executor may not make architectural decisions",
    ],
  },
  tokenOptimization: {
    enabled: true,
    savingsTarget: 0.5,
    reportSavings: true,
  },
  stateStorage: "memory",
};
```

```typescript
// src/config/loader.ts
import { readFile } from "fs/promises";
import { OrchestratorConfig, OrchestratorConfigSchema, DEFAULT_CONFIG } from "./types.js";

export class ConfigLoader {
  async load(configPath: string = "orchestrator-config.json"): Promise<OrchestratorConfig> {
    try {
      const content = await readFile(configPath, "utf-8");
      const json = JSON.parse(content);
      const config = OrchestratorConfigSchema.parse(json);
      
      // Merge with defaults
      return this.mergeWithDefaults(config);
    } catch (error) {
      console.warn(`Could not load config from ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
  }

  private mergeWithDefaults(config: Partial<OrchestratorConfig>): OrchestratorConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      agents: { ...DEFAULT_CONFIG.agents, ...config.agents },
      roleBoundaries: { ...DEFAULT_CONFIG.roleBoundaries, ...config.roleBoundaries },
      tokenOptimization: { ...DEFAULT_CONFIG.tokenOptimization, ...config.tokenOptimization },
    };
  }
}
```

**Success Criteria:**
- Config loads from JSON file
- Validates against schema
- Merges with defaults correctly
- Tests cover all scenarios

---

### Task 2: Role Boundary Enforcement 🚧
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Enforce agent role boundaries to prevent token waste

**Steps:**
1. Create src/enforcement/role-enforcer.ts
2. Implement checkCapability method
3. Add enforcement to tool calls
4. Log violations
5. Write tests for enforcement

**Implementation:**
```typescript
// src/enforcement/role-enforcer.ts
import { AgentConfig, OrchestratorConfig } from "../config/types.js";

export class RoleEnforcer {
  constructor(private config: OrchestratorConfig) {}

  checkCapability(agent: string, capability: string): boolean {
    if (!this.config.roleBoundaries?.enforce) {
      return true; // Enforcement disabled
    }

    const agentConfig = this.config.agents[agent];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agent}`);
    }

    return agentConfig.capabilities.includes(capability);
  }

  enforceTaskDelegation(planner: string, executor: string, task: string): void {
    if (!this.config.roleBoundaries?.enforce) {
      return;
    }

    // Check planner has planning capability
    if (!this.checkCapability(planner, "planning")) {
      throw new Error(`Agent ${planner} does not have planning capability`);
    }

    // Check executor has execution capability
    if (!this.checkCapability(executor, "execution")) {
      throw new Error(`Agent ${executor} does not have execution capability`);
    }

    // Check role-specific rules
    const plannerRole = this.config.agents[planner].role;
    const executorRole = this.config.agents[executor].role;

    if (plannerRole === "executor") {
      throw new Error(`Agent ${planner} is an executor, cannot plan tasks`);
    }

    if (executorRole === "planner") {
      throw new Error(`Agent ${executor} is a planner, cannot execute tasks`);
    }
  }

  shouldDelegateCodeReading(agent: string, fileSize: number): boolean {
    if (!this.config.roleBoundaries?.enforce) {
      return false;
    }

    const agentConfig = this.config.agents[agent];
    if (!agentConfig) {
      return false;
    }

    // Planners should delegate large file reads
    if (agentConfig.role === "planner" && fileSize > 200) {
      console.warn(
        `Agent ${agent} should delegate reading (file size: ${fileSize} lines > 200 lines threshold)`
      );
      return true;
    }

    return false;
  }
}
```

**Success Criteria:**
- Enforces role boundaries
- Prevents invalid delegations
- Logs warnings for efficiency violations
- Tests cover all enforcement rules

---

### Task 3: Token Tracking & Metrics 📊
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Comprehensive token tracking across workflows

**Steps:**
1. Create src/metrics/token-tracker.ts
2. Implement token estimation (heuristic)
3. Track actual token usage per task/workflow
4. Calculate savings vs. baseline
5. Generate metrics reports
6. Write tests

**Implementation:**
```typescript
// src/metrics/token-tracker.ts
import { OrchestratorConfig } from "../config/types.js";
import { StateManager } from "../state/state-manager.js";

export interface TokenMetrics {
  totalTokens: number;
  byAgent: Record<string, number>;
  byStage: Record<string, number>;
  cost: number;
  savingsVsBaseline: number;
  savingsPercentage: number;
}

export class TokenTracker {
  constructor(
    private config: OrchestratorConfig,
    private stateManager: StateManager
  ) {}

  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  trackTokenUsage(
    workflowId: string,
    agent: string,
    stage: string,
    tokens: number
  ): void {
    this.stateManager.trackTokenUsage(workflowId, stage, tokens);
    
    // Log for analytics
    console.error(JSON.stringify({
      event: "token_usage",
      workflowId,
      agent,
      stage,
      tokens,
      cost: this.calculateCost(agent, tokens),
    }));
  }

  calculateCost(agent: string, tokens: number): number {
    const agentConfig = this.config.agents[agent];
    if (!agentConfig?.costPerToken) {
      return 0;
    }
    return tokens * agentConfig.costPerToken;
  }

  calculateSavings(workflowId: string): TokenMetrics {
    const workflow = this.stateManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const totalTokens = workflow.tokenUsage.total;

    // Estimate baseline (manual coordination)
    // Baseline = sum of:
    // - task specs (250 tokens each)
    // - reports (400 tokens each)
    // - reviews (150 tokens each)
    const baselinePerTask = 250 + 400 + 150; // 800 tokens
    const baseline = workflow.tasks.length * baselinePerTask;

    const savings = baseline - totalTokens;
    const savingsPercentage = baseline > 0 ? savings / baseline : 0;

    // Calculate cost
    const costByAgent: Record<string, number> = {};
    let totalCost = 0;

    for (const task of workflow.tasks) {
      const agent = task.executor;
      const tokens = task.tokenUsage?.total || 0;
      const cost = this.calculateCost(agent, tokens);
      costByAgent[agent] = (costByAgent[agent] || 0) + cost;
      totalCost += cost;
    }

    return {
      totalTokens,
      byAgent: this.aggregateByAgent(workflow),
      byStage: workflow.tokenUsage,
      cost: totalCost,
      savingsVsBaseline: savings,
      savingsPercentage,
    };
  }

  private aggregateByAgent(workflow: any): Record<string, number> {
    const byAgent: Record<string, number> = {};
    for (const task of workflow.tasks) {
      const agent = task.executor;
      const tokens = task.tokenUsage?.total || 0;
      byAgent[agent] = (byAgent[agent] || 0) + tokens;
    }
    return byAgent;
  }

  generateReport(workflowId: string): string {
    const metrics = this.calculateSavings(workflowId);

    return `
**Token Usage Report**

**Total Tokens:** ${metrics.totalTokens}

**By Agent:**
${Object.entries(metrics.byAgent)
  .map(([agent, tokens]) => `- ${agent}: ${tokens} tokens (${this.calculateCost(agent, tokens).toFixed(4)} USD)`)
  .join("\n")}

**By Stage:**
- Planning: ${metrics.byStage.planning} tokens
- Execution: ${metrics.byStage.execution} tokens
- Validation: ${metrics.byStage.validation} tokens
- Reporting: ${metrics.byStage.reporting} tokens

**Cost:** $${metrics.cost.toFixed(4)}

**Savings:**
- Tokens saved: ${metrics.savingsVsBaseline} (${(metrics.savingsPercentage * 100).toFixed(1)}%)
- Savings vs. manual coordination

${metrics.savingsPercentage >= this.config.tokenOptimization!.savingsTarget
  ? "✅ Meets savings target"
  : `⚠️ Below savings target (${(this.config.tokenOptimization!.savingsTarget * 100).toFixed(0)}%)`
}
`.trim();
  }
}
```

**Success Criteria:**
- Tracks tokens by agent, stage
- Calculates cost accurately
- Computes savings vs. baseline
- Generates clear reports
- Tests verify calculations

---

### Task 4: optimize_tokens Tool 💡
**Estimated Complexity:** Medium  
**Time:** 1 hour

**Purpose:** Analyze workflows and suggest optimization opportunities

**Steps:**
1. Create src/tools/optimize-tokens.ts
2. Analyze workflow patterns
3. Identify delegation opportunities
4. Suggest template improvements
5. Generate recommendations
6. Write tests

**Implementation:**
```typescript
// src/tools/optimize-tokens.ts
import { z } from "zod";
import { StateManager } from "../state/state-manager.js";
import { TokenTracker } from "../metrics/token-tracker.js";

const OptimizeTokensInputSchema = z.object({
  workflowId: z.string().optional(),
  timeRange: z.string().optional(), // "last-24h", "last-week"
});

export type OptimizeTokensInput = z.infer<typeof OptimizeTokensInputSchema>;

export function optimizeTokens(
  input: OptimizeTokensInput,
  stateManager: StateManager,
  tokenTracker: TokenTracker
): string {
  if (input.workflowId) {
    return optimizeWorkflow(input.workflowId, stateManager, tokenTracker);
  } else {
    return optimizeAll(stateManager, tokenTracker);
  }
}

function optimizeWorkflow(
  workflowId: string,
  stateManager: StateManager,
  tokenTracker: TokenTracker
): string {
  const workflow = stateManager.getWorkflow(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const metrics = tokenTracker.calculateSavings(workflowId);
  const recommendations: string[] = [];

  // Analyze patterns
  const plannerTasks = workflow.tasks.filter((t) =>
    stateManager.getAgentRole(t.executor) === "planner"
  );

  if (plannerTasks.length > 0) {
    recommendations.push(
      `⚠️ Found ${plannerTasks.length} tasks executed by planners. Consider delegating to executors for 60-80% token savings.`
    );
  }

  // Check for repeated patterns
  const tasksByTemplate: Record<string, number> = {};
  for (const task of workflow.tasks) {
    tasksByTemplate[task.spec.template] =
      (tasksByTemplate[task.spec.template] || 0) + 1;
  }

  for (const [template, count] of Object.entries(tasksByTemplate)) {
    if (count >= 3) {
      recommendations.push(
        `💡 Template "${template}" used ${count} times. Consider batching similar tasks for better efficiency.`
      );
    }
  }

  return `
${tokenTracker.generateReport(workflowId)}

**Optimization Recommendations:**
${recommendations.map((rec) => `- ${rec}`).join("\n") || "✅ No major optimization opportunities identified"}
`.trim();
}

function optimizeAll(
  stateManager: StateManager,
  tokenTracker: TokenTracker
): string {
  // Aggregate optimization suggestions across all workflows
  return "Analyze all workflows for optimization opportunities";
}
```

**Success Criteria:**
- Analyzes workflow patterns
- Identifies optimization opportunities
- Provides actionable recommendations
- Tests verify analysis

---

### Task 5: Quality Gates 🛡️
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Automated quality checks before task completion

**Steps:**
1. Create src/quality/gates.ts
2. Define quality gate types (tests, lint, build, validation)
3. Implement gate execution
4. Integrate with collect_report
5. Write tests

**Implementation:**
```typescript
// src/quality/gates.ts
import { ExecutionReport } from "../tools/collect-report.js";

export interface QualityGate {
  name: string;
  check: (report: ExecutionReport) => boolean;
  message: string;
}

export const DEFAULT_QUALITY_GATES: QualityGate[] = [
  {
    name: "tests-passing",
    check: (report) =>
      report.metrics?.testsPassed === report.metrics?.testsTotal &&
      report.metrics?.testsTotal! > 0,
    message: "All tests must pass",
  },
  {
    name: "build-success",
    check: (report) => report.metrics?.buildSuccess === true,
    message: "Build must succeed",
  },
  {
    name: "no-critical-issues",
    check: (report) =>
      !report.issues ||
      !report.issues.some((issue) => issue.includes("CRITICAL")),
    message: "No critical issues allowed",
  },
];

export function runQualityGates(
  report: ExecutionReport,
  gates: QualityGate[] = DEFAULT_QUALITY_GATES
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const gate of gates) {
    if (!gate.check(report)) {
      failures.push(`${gate.name}: ${gate.message}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
```

**Success Criteria:**
- Gates execute correctly
- Integration with collect_report works
- Configurable gates
- Tests verify all gates

---

### Task 6: Integration & Documentation 📚
**Estimated Complexity:** Easy  
**Time:** 1 hour

**Purpose:** Integrate all features and document

**Steps:**
1. Update src/index.ts with config and enforcement
2. Wire up token tracking to all tools
3. Add optimize_tokens tool to MCP server
4. Create example configurations
5. Document all features
6. Write end-to-end tests

**Success Criteria:**
- All features integrated
- Configuration loads on startup
- Role boundaries enforced
- Documentation complete

---

## Dependencies

```
Task 1 (Configuration System)
  ↓
Task 2 (Role Boundary Enforcement)
  ↓
Task 3 (Token Tracking) → Task 4 (optimize_tokens Tool)
  ↓
Task 5 (Quality Gates)
  ↓
Task 6 (Integration)
```

---

## Success Criteria (Sprint Completion)

- [x] Configuration system loads and validates config
- [x] Role boundaries enforced
- [x] Token tracking comprehensive
- [x] optimize_tokens tool provides actionable insights
- [x] Quality gates prevent incomplete work
- [x] All tests pass (>80% coverage)
- [x] Documentation complete

---

## Outputs

### Code Artifacts
- src/config/* (configuration system)
- src/enforcement/* (role enforcer)
- src/metrics/* (token tracker)
- src/quality/* (quality gates)
- src/tools/optimize-tokens.ts
- examples/orchestrator-config.json

### Documentation
- docs/configuration.md
- docs/role-boundaries.md
- docs/token-optimization.md

---

## Token Budget

**Estimated Token Usage:**
- Claude planning: 350 tokens
- Task specs: 200 tokens × 6 = 1200 tokens
- Gemini execution: (uses Gemini budget)
- Claude reviews: 200 tokens × 6 = 1200 tokens

**Total Claude Tokens:** ~2750 tokens

---

## Next Sprint Preview

**Sprint 005** will add:
- CLI for standalone usage
- Observability dashboard
- Persistent state storage
- Publishing and distribution

---

**Status:** Completed (2026-02-12)  
**Assigned To:** Gemini (execution), Claude (review)  
**Created:** 2026-02-12  
**Updated:** 2026-02-12
