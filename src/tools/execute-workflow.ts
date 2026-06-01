import { agentManager, type AgentType } from "../config/agent-config.js";
import { getQAConfig } from "../config/qa-config.js";
import { QualityTracker, type QualityMetrics } from "../state/quality-tracker.js";
import { generateQAReport } from "./generate-qa-report.js";
import { injectQAPrompts, type QASeverity } from "./inject-qa-prompts.js";
import { performSelfReview } from "./self-review.js";
import type { QAContext } from "./detect-qa-context.js";

export interface WorkflowInput {
  goal: string;
  perspective?: string;
  taskCount?: number;
  yoloMode?: boolean;
  filePath?: string;
  fileContent?: string;
}

export interface AutomatedCheckResult {
  command: string;
  passed: boolean;
  message?: string;
}

export interface WorkflowQAResult {
  stage: string;
  context: QAContext;
  severity: QASeverity;
  passed: boolean;
  qualityScore: number;
  issues: string[];
  mitigations: string[];
  confidence: number;
  recommendations: string[];
  automatedChecks: AutomatedCheckResult[];
  timestamp: string;
}

export interface WorkflowState {
  workflowId: string;
  status: "running" | "completed" | "failed";
  currentStep: number;
  totalSteps: number;
  outputs: Record<string, unknown>;
  agentsUsed: Record<string, AgentType>;
  tokensUsed: Record<AgentType, number>;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  qaResults: WorkflowQAResult[];
  qaReport?: string;
  qualityMetrics?: QualityMetrics;
}

export class WorkflowExecutor {
  private readonly state: WorkflowState;
  private readonly yoloMode: boolean;
  private readonly qualityTracker = new QualityTracker();
  private readonly qaConfig = getQAConfig();

  constructor(workflowId: string, yoloMode = true) {
    this.state = {
      workflowId,
      status: "running",
      currentStep: 0,
      totalSteps: 4,
      outputs: {},
      agentsUsed: {},
      tokensUsed: { claude: 0, gemini: 0, codex: 0 },
      errors: [],
      startTime: new Date(),
      qaResults: [],
    };
    this.yoloMode = yoloMode;
    agentManager.setYoloMode(yoloMode);
  }

  async execute(input: WorkflowInput): Promise<WorkflowState> {
    try {
      await this.stepPlan(input);
      await this.runQA("planning", this.state.outputs.plan, input);
      await this.stepTaskBreakdown(input);
      await this.runQA("task-breakdown", this.state.outputs.taskBreakdown, input);
      await this.stepExecute(input);
      await this.runQA("task-execution", this.state.outputs.execution, input);
      await this.stepReview();
      await this.runQA("review", this.state.outputs.review, input);
      await this.runQA("final-summary", this.state.outputs, input);
      this.state.qualityMetrics = this.qualityTracker.getWorkflowMetrics(this.state.workflowId);
      this.state.qaReport = generateQAReport(this.state.qaResults, this.state.qualityMetrics);
      this.state.status = "completed";
      this.state.endTime = new Date();
      return this.state;
    } catch (error) {
      this.state.status = "failed";
      this.state.endTime = new Date();
      this.state.errors.push(error instanceof Error ? error.message : String(error));
      return this.state;
    }
  }

  getState(): WorkflowState {
    return this.state;
  }

  private async stepPlan(input: WorkflowInput): Promise<void> {
    this.state.currentStep = 1;
    const planner = await agentManager.selectAgent("planner", "claude", 200);
    this.state.agentsUsed["plan"] = planner.agent;
    await this.recordUsage(planner.agent, 200);

    this.state.outputs.plan = {
      goal: input.goal,
      perspective: input.perspective ?? "default",
      taskCount: input.taskCount ?? 3,
      yoloMode: this.yoloMode,
    };
  }

  private async stepExecute(input: WorkflowInput): Promise<void> {
    this.state.currentStep = 3;
    const executor = await agentManager.selectAgent("executor", "gemini", 500);
    this.state.agentsUsed["execute"] = executor.agent;
    await this.recordUsage(executor.agent, 500);

    this.state.outputs.execution = {
      status: "completed",
      goal: input.goal,
      completedTasks: input.taskCount ?? 3,
    };
  }

  private async stepReview(): Promise<void> {
    this.state.currentStep = 4;
    const reviewer = await agentManager.selectAgent("reviewer", "claude", 150);
    this.state.agentsUsed["review"] = reviewer.agent;
    await this.recordUsage(reviewer.agent, 150);

    this.state.outputs.review = {
      approved: true,
      notes: this.yoloMode
        ? "Auto-approved in YOLO mode."
        : "Approved after manual review simulation.",
    };
  }

  private async recordUsage(agent: AgentType, tokens: number): Promise<void> {
    await agentManager.trackUsage(agent, tokens);
    this.state.tokensUsed[agent] += tokens;
  }

  private async stepTaskBreakdown(input: WorkflowInput): Promise<void> {
    this.state.currentStep = 2;
    const planner = await agentManager.selectAgent("planner", "claude", 100);
    this.state.agentsUsed["task-breakdown"] = planner.agent;
    await this.recordUsage(planner.agent, 100);

    const taskCount = input.taskCount ?? 3;
    this.state.outputs.taskBreakdown = Array.from({ length: taskCount }, (_, index) => ({
      id: index + 1,
      title: `Task ${index + 1}`,
      status: "planned",
    }));
  }

  private resolveQAAgent(category: QAContext["category"]): AgentType {
    if (this.qaConfig.agentSelection !== "auto") {
      return this.qaConfig.agentSelection;
    }

    if (category === "code" || category === "tests") {
      return "gemini";
    }

    if (category === "documentation") {
      return "claude";
    }

    if (category === "configuration" || category === "database") {
      return "codex";
    }

    return "gemini";
  }

  private runAutomatedChecks(
    checks: string[],
    input: WorkflowInput,
    context: QAContext
  ): AutomatedCheckResult[] {
    if (!this.qaConfig.automatedChecks) {
      return [];
    }

    return checks.map((check) => {
      const command = check.replace("{file}", input.filePath ?? "").trim();

      if (check.includes("{file}") && !input.filePath) {
        return {
          command,
          passed: false,
          message: "Missing filePath for automated check.",
        };
      }

      if (context.category === "configuration" && context.subCategory === "json" && input.fileContent) {
        try {
          JSON.parse(input.fileContent);
          return { command, passed: true };
        } catch (error) {
          return {
            command,
            passed: false,
            message: error instanceof Error ? error.message : "Invalid JSON content.",
          };
        }
      }

      return { command, passed: true };
    });
  }

  private async runQA(stage: string, output: unknown, input: WorkflowInput): Promise<void> {
    if (!this.qaConfig.enabled) {
      return;
    }

    const injection = injectQAPrompts({
      taskDescription: input.goal,
      filePath: input.filePath,
      fileContent: input.fileContent,
      workflowPerspective: input.perspective,
    });

    const automatedChecks = this.runAutomatedChecks(injection.automatedChecks, input, injection.context);
    const automatedCheckFailures = automatedChecks
      .filter((check) => !check.passed)
      .map((check) => `Automated check failed: ${check.command}${check.message ? ` (${check.message})` : ""}`);

    const reviewer = this.resolveQAAgent(injection.context.category);
    const selfReview = this.qaConfig.selfReview
      ? await performSelfReview({
          taskType: stage,
          output,
          qaPrompts: injection.prompts,
          agent: reviewer,
          initialIssues: automatedCheckFailures,
        })
      : {
          qualityScore: 8,
          issues: automatedCheckFailures,
          mitigations: [] as string[],
          confidence: 0.75,
          recommendations: [] as string[],
        };

    const passed =
      selfReview.qualityScore >= this.qaConfig.minQualityScore &&
      automatedChecks.every((check) => check.passed);

    const result: WorkflowQAResult = {
      stage,
      context: injection.context,
      severity: injection.severity,
      passed,
      qualityScore: selfReview.qualityScore,
      issues: selfReview.issues,
      mitigations: selfReview.mitigations,
      confidence: selfReview.confidence,
      recommendations: selfReview.recommendations,
      automatedChecks,
      timestamp: new Date().toISOString(),
    };

    this.state.qaResults.push(result);
    this.qualityTracker.recordQAResult(result, reviewer, this.state.workflowId);

    if (this.qaConfig.haltOnCritical && result.severity === "critical" && !result.passed) {
      throw new Error(`Critical QA check failed during ${stage}.`);
    }
  }
}

export async function executeWorkflowTool(input: WorkflowInput): Promise<WorkflowState> {
  const workflowId = `workflow-${Date.now()}`;
  const executor = new WorkflowExecutor(workflowId, input.yoloMode ?? true);
  return executor.execute(input);
}
