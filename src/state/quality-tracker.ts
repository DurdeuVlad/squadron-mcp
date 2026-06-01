import type { AgentType } from "../config/agent-config.js";
import type { QASeverity } from "../tools/inject-qa-prompts.js";
import type { QAContext } from "../tools/detect-qa-context.js";

export interface QAResultRecord {
  stage: string;
  context: QAContext;
  severity: QASeverity;
  passed: boolean;
  qualityScore: number;
  issues: string[];
}

export interface QualityMetrics {
  workflowId: string;
  timestamp: Date;
  averageQualityScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalFailures: number;
  byAgent: Record<AgentType, { avgScore: number; checks: number }>;
  byCategory: Record<string, { avgScore: number; checks: number }>;
}

function createAgentMetrics(): Record<AgentType, { avgScore: number; checks: number }> {
  return {
    claude: { avgScore: 0, checks: 0 },
    gemini: { avgScore: 0, checks: 0 },
    codex: { avgScore: 0, checks: 0 },
  };
}

function updateAverage(currentAverage: number, currentCount: number, nextValue: number): number {
  if (currentCount <= 0) {
    return nextValue;
  }
  return (currentAverage * currentCount + nextValue) / (currentCount + 1);
}

export class QualityTracker {
  private readonly metrics = new Map<string, QualityMetrics>();

  recordQAResult(result: QAResultRecord, agent: AgentType, workflowId: string): void {
    const existing =
      this.metrics.get(workflowId) ??
      {
        workflowId,
        timestamp: new Date(),
        averageQualityScore: 0,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        criticalFailures: 0,
        byAgent: createAgentMetrics(),
        byCategory: {},
      };

    existing.totalChecks += 1;
    existing.timestamp = new Date();
    if (result.passed) {
      existing.passedChecks += 1;
    } else {
      existing.failedChecks += 1;
    }
    if (result.severity === "critical" && !result.passed) {
      existing.criticalFailures += 1;
    }

    const agentMetrics = existing.byAgent[agent];
    agentMetrics.avgScore = updateAverage(agentMetrics.avgScore, agentMetrics.checks, result.qualityScore);
    agentMetrics.checks += 1;

    const categoryKey = result.context.category;
    const categoryMetrics = existing.byCategory[categoryKey] ?? { avgScore: 0, checks: 0 };
    categoryMetrics.avgScore = updateAverage(
      categoryMetrics.avgScore,
      categoryMetrics.checks,
      result.qualityScore
    );
    categoryMetrics.checks += 1;
    existing.byCategory[categoryKey] = categoryMetrics;

    existing.averageQualityScore = updateAverage(
      existing.averageQualityScore,
      existing.totalChecks - 1,
      result.qualityScore
    );

    this.metrics.set(workflowId, existing);
  }

  getWorkflowMetrics(workflowId: string): QualityMetrics | undefined {
    return this.metrics.get(workflowId);
  }

  listMetrics(): QualityMetrics[] {
    return [...this.metrics.values()];
  }

  generateTrendReport(limit = 10): string {
    const recent = this.listMetrics().slice(-limit);
    if (recent.length === 0) {
      return "Quality trends unavailable: no workflow metrics recorded yet.";
    }

    const averageQualityScore =
      recent.reduce((sum, metric) => sum + metric.averageQualityScore, 0) / recent.length;
    const passRate =
      recent.reduce((sum, metric) => sum + metric.passedChecks / Math.max(1, metric.totalChecks), 0) /
      recent.length;
    const criticalFailures = recent.reduce((sum, metric) => sum + metric.criticalFailures, 0);

    return [
      `Quality Trends (last ${recent.length} workflows):`,
      `- Average quality score: ${averageQualityScore.toFixed(1)}/10`,
      `- Pass rate: ${(passRate * 100).toFixed(0)}%`,
      `- Critical failures: ${criticalFailures}`,
    ].join("\n");
  }
}
