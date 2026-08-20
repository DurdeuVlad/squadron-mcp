import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../../src/config/types.js";
import { TokenTracker } from "../../src/metrics/token-tracker.js";
import { StateManager } from "../../src/state/state-manager.js";

describe("TokenTracker", () => {
  it("estimates tokens from text", () => {
    const tracker = new TokenTracker(DEFAULT_CONFIG, new StateManager());
    expect(tracker.estimateTokens("1234")).toBe(1);
    expect(tracker.estimateTokens("12345")).toBe(2);
  });

  it("computes real usage and cost - no comparison against an assumed baseline", () => {
    const stateManager = new StateManager();
    const tracker = new TokenTracker(DEFAULT_CONFIG, stateManager);
    const workflow = stateManager.createWorkflow("metrics");

    stateManager.createTask({
      id: "task-1",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: {
        created: new Date().toISOString(),
      },
    });
    stateManager.addTaskToWorkflow(workflow.id, "task-1");
    stateManager.trackTaskTokenUsage("task-1", 100);
    tracker.trackTokenUsage(workflow.id, "gemini", "execution", 100);

    const metrics = tracker.getUsageMetrics(workflow.id);
    expect(metrics.totalTokens).toBe(100);
    expect(metrics.byAgent.gemini).toBe(100);
    expect(metrics).not.toHaveProperty("savingsVsBaseline");
    expect(metrics).not.toHaveProperty("savingsPercentage");
  });

  it("throws for missing workflow", () => {
    const tracker = new TokenTracker(DEFAULT_CONFIG, new StateManager());
    expect(() => tracker.getUsageMetrics("missing")).toThrow("Workflow not found");
  });

  it("returns zero cost for unknown agent pricing", () => {
    const tracker = new TokenTracker(DEFAULT_CONFIG, new StateManager());
    expect(tracker.calculateCost("unknown-agent", 100)).toBe(0);
  });

  it("handles empty workflows without crashing and reports zero usage honestly", () => {
    const stateManager = new StateManager();
    const tracker = new TokenTracker(DEFAULT_CONFIG, stateManager);
    const workflow = stateManager.createWorkflow("empty");

    const metrics = tracker.getUsageMetrics(workflow.id);
    const report = tracker.generateReport(workflow.id);

    expect(metrics.totalTokens).toBe(0);
    expect(report).toContain("Total Tokens: 0");
    // No fabricated "savings"/"target" language anywhere in the report.
    expect(report).not.toMatch(/savings/iu);
    expect(report).not.toMatch(/target/iu);
  });

  it("generateReport includes a real per-agent cost breakdown", () => {
    const stateManager = new StateManager();
    const tracker = new TokenTracker(DEFAULT_CONFIG, stateManager);
    const workflow = stateManager.createWorkflow("cost-breakdown");
    stateManager.createTask({
      id: "task-2",
      task: "Task",
      executor: "gemini",
      template: "typescript-feature",
      context: {},
      inputs: {},
      executionSteps: [],
      expectedOutputs: [],
      successCriteria: [],
      metadata: {
        created: new Date().toISOString(),
      },
    });
    stateManager.addTaskToWorkflow(workflow.id, "task-2");
    tracker.trackTokenUsage(workflow.id, "gemini", "execution", 10);

    const report = tracker.generateReport(workflow.id);
    expect(report).toContain("**By Agent:**");
    expect(report).toContain("Cost: $");
    expect(report).not.toMatch(/savings/iu);
  });
});
