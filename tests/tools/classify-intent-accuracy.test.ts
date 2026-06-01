import { describe, expect, it } from "vitest";

import { classifyIntent, type IntentType } from "../../src/tools/classify-intent.js";

interface Case {
  message: string;
  expected: IntentType;
}

const workflowCases: Case[] = [
  { message: "Implement authentication for API gateway", expected: "workflow-candidate" },
  { message: "Build a full billing workflow", expected: "workflow-candidate" },
  { message: "Create feature rollout pipeline", expected: "workflow-candidate" },
  { message: "Fix all failing integration flows", expected: "workflow-candidate" },
  { message: "Optimize backend architecture for throughput", expected: "workflow-candidate" },
  { message: "Refactor monolith into modules", expected: "workflow-candidate" },
  { message: "Audit API endpoints from security perspective", expected: "workflow-candidate" },
  { message: "Analyze quality from fairness perspective", expected: "workflow-candidate" },
  { message: "Review this app from performance perspective", expected: "workflow-candidate" },
  { message: "Run my usual workflow for this repo", expected: "workflow-candidate" },
  { message: "Start standard process for sprint execution", expected: "workflow-candidate" },
  { message: "Prepare a sprint with multiple tasks", expected: "workflow-candidate" },
  { message: "Execute a series of implementation tasks", expected: "workflow-candidate" },
  { message: "Implement CI and release automation", expected: "workflow-candidate" },
  { message: "Build observability system end to end", expected: "workflow-candidate" },
  { message: "Create roadmap execution workflow", expected: "workflow-candidate" },
  { message: "Add feature flags platform", expected: "workflow-candidate" },
  { message: "Automate this with your standard workflow", expected: "workflow-candidate" },
];

const questionCases: Case[] = [
  { message: "What is orchestration?", expected: "simple-question" },
  { message: "What are task specs?", expected: "simple-question" },
  { message: "Explain auto orchestration", expected: "simple-question" },
  { message: "Tell me about workflow templates", expected: "simple-question" },
  { message: "How does classify intent work?", expected: "simple-question" },
  { message: "How to tune confidence thresholds?", expected: "simple-question" },
  { message: "Why use confirmation prompts?", expected: "simple-question" },
  { message: "When should we trigger workflows?", expected: "simple-question" },
  { message: "Which one should I use for docs?", expected: "simple-question" },
  { message: "Show me an example of audit mode", expected: "simple-question" },
  { message: "What does context boost mean?", expected: "simple-question" },
  { message: "What is the difference between planner and executor?", expected: "simple-question" },
  { message: "How does token optimization help?", expected: "simple-question" },
  { message: "Why is branch coverage important?", expected: "simple-question" },
  { message: "What are quality gates?", expected: "simple-question" },
  { message: "Explain workflow state storage", expected: "simple-question" },
  { message: "How to run the dashboard?", expected: "simple-question" },
  { message: "What is YOLO mode?", expected: "simple-question" },
];

const complexTaskCases: Case[] = [
  { message: "Write a function to parse markdown headers", expected: "complex-task" },
  { message: "Create a script to validate schema files", expected: "complex-task" },
  { message: "Update this config file with defaults", expected: "complex-task" },
  { message: "Modify tool wrapper to include metadata", expected: "complex-task" },
  { message: "Debug a failing lint rule", expected: "complex-task" },
  { message: "Troubleshoot test flakiness in CI", expected: "complex-task" },
  { message: "Write a function that merges arrays", expected: "complex-task" },
  { message: "Create a script for changelog generation", expected: "complex-task" },
  { message: "Update docs links for new tools", expected: "complex-task" },
  { message: "Modify command options in the CLI parser", expected: "complex-task" },
  { message: "Debug this null reference error", expected: "complex-task" },
  { message: "Troubleshoot dashboard API timeout", expected: "complex-task" },
  { message: "Write a function to normalize paths", expected: "complex-task" },
  { message: "Create a script to collect metrics", expected: "complex-task" },
  { message: "Update tests to include edge cases", expected: "complex-task" },
  { message: "Modify progress reporting format", expected: "complex-task" },
  { message: "Debug configuration loading error", expected: "complex-task" },
  { message: "Troubleshoot packaging issue", expected: "complex-task" },
];

function accuracy(cases: Case[]): number {
  const correct = cases.filter((item) => classifyIntent({ userMessage: item.message }).type === item.expected)
    .length;
  return correct / cases.length;
}

describe("classifyIntent accuracy", () => {
  it("meets sprint-level classification thresholds", () => {
    const allCases = [...workflowCases, ...questionCases, ...complexTaskCases];
    const overall = accuracy(allCases);
    const workflowAccuracy = accuracy(workflowCases);
    const questionAccuracy = accuracy(questionCases);

    expect(allCases.length).toBeGreaterThanOrEqual(50);
    expect(overall).toBeGreaterThanOrEqual(0.8);
    expect(workflowAccuracy).toBeGreaterThanOrEqual(0.8);
    expect(questionAccuracy).toBeGreaterThanOrEqual(0.95);
  });
});
