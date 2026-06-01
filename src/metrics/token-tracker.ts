import type { OrchestratorConfig } from "../config/types.js";
import type { TokenStage } from "../state/types.js";
import { StateManager } from "../state/state-manager.js";

export interface TokenMetrics {
  totalTokens: number;
  byAgent: Record<string, number>;
  byStage: {
    planning: number;
    execution: number;
    validation: number;
    reporting: number;
    total: number;
  };
  cost: number;
  savingsVsBaseline: number;
  savingsPercentage: number;
}

export class TokenTracker {
  private readonly config: OrchestratorConfig;
  private readonly stateManager: StateManager;

  constructor(config: OrchestratorConfig, stateManager: StateManager) {
    this.config = config;
    this.stateManager = stateManager;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  trackTokenUsage(workflowId: string, agent: string, stage: TokenStage, tokens: number): void {
    this.stateManager.trackWorkflowTokenUsage(workflowId, stage, tokens);

    console.error(
      JSON.stringify({
        event: "token_usage",
        workflowId,
        agent,
        stage,
        tokens,
        cost: this.calculateCost(agent, tokens),
      })
    );
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
    const baselinePerTask = 800;
    const baseline = workflow.tasks.length * baselinePerTask;
    const savings = baseline - totalTokens;
    const savingsPercentage = baseline > 0 ? savings / baseline : 0;

    let totalCost = 0;
    const byAgent: Record<string, number> = {};
    for (const task of workflow.tasks) {
      const agent = task.executor;
      const tokens = task.tokenUsage?.total ?? 0;
      byAgent[agent] = (byAgent[agent] ?? 0) + tokens;
      totalCost += this.calculateCost(agent, tokens);
    }

    return {
      totalTokens,
      byAgent,
      byStage: workflow.tokenUsage,
      cost: totalCost,
      savingsVsBaseline: savings,
      savingsPercentage,
    };
  }

  generateReport(workflowId: string): string {
    const metrics = this.calculateSavings(workflowId);
    const target = this.config.tokenOptimization?.savingsTarget ?? 0.5;
    const meetsTarget = metrics.savingsPercentage >= target;

    return [
      "**Token Usage Report**",
      "",
      `Total Tokens: ${metrics.totalTokens}`,
      "",
      "**By Agent:**",
      ...Object.entries(metrics.byAgent).map(([agent, tokens]) => {
        return `- ${agent}: ${tokens} tokens ($${this.calculateCost(agent, tokens).toFixed(4)})`;
      }),
      "",
      "**By Stage:**",
      `- Planning: ${metrics.byStage.planning}`,
      `- Execution: ${metrics.byStage.execution}`,
      `- Validation: ${metrics.byStage.validation}`,
      `- Reporting: ${metrics.byStage.reporting}`,
      `- Total: ${metrics.byStage.total}`,
      "",
      `Cost: $${metrics.cost.toFixed(4)}`,
      `Savings: ${metrics.savingsVsBaseline} tokens (${(metrics.savingsPercentage * 100).toFixed(1)}%)`,
      meetsTarget ? "Meets savings target." : `Below savings target (${(target * 100).toFixed(0)}%).`,
    ].join("\n");
  }
}
