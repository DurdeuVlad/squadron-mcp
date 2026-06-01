import { describe, expect, it } from "vitest";

import { extractWorkflowParams } from "../../src/tools/extract-workflow-params.js";

interface ExtractionCase {
  message: string;
  expectedGoal: string;
  expectedTaskCount: number;
  expectedIsAudit: boolean;
  expectedPerspective?: string;
}

const extractionCases: ExtractionCase[] = [
  {
    message: "Implement format templates",
    expectedGoal: "implement format templates",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Build dashboard with 8 tasks",
    expectedGoal: "build dashboard",
    expectedTaskCount: 8,
    expectedIsAudit: false,
  },
  {
    message: "Create API contract tests with 5 tasks",
    expectedGoal: "create api contract tests",
    expectedTaskCount: 5,
    expectedIsAudit: false,
  },
  {
    message: "Audit debate quality from fairness perspective",
    expectedGoal: "audit debate quality",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "fairness",
  },
  {
    message: "Analyze output quality from security perspective",
    expectedGoal: "analyze output quality",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "security",
  },
  {
    message: "Review API from performance perspective",
    expectedGoal: "review api",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "performance",
  },
  {
    message: "Please implement release automation",
    expectedGoal: "implement release automation",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "I need to refactor state manager with 4 tasks",
    expectedGoal: "refactor state manager",
    expectedTaskCount: 4,
    expectedIsAudit: false,
  },
  {
    message: "Optimize token reporting",
    expectedGoal: "optimize token reporting",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Fix all workflow regressions with 10 tasks",
    expectedGoal: "fix all workflow regressions",
    expectedTaskCount: 10,
    expectedIsAudit: false,
  },
  {
    message: "Performance audit of endpoint stability",
    expectedGoal: "performance audit of endpoint stability",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "performance",
  },
  {
    message: "Security audit of auth pipeline",
    expectedGoal: "security audit of auth pipeline",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "security",
  },
  {
    message: "Implement roadmap tasks",
    expectedGoal: "implement roadmap tasks",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Build migration runner",
    expectedGoal: "build migration runner",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Create docs tooling with 3 tasks",
    expectedGoal: "create docs tooling",
    expectedTaskCount: 3,
    expectedIsAudit: false,
  },
  {
    message: "Audit logging from reliability perspective",
    expectedGoal: "audit logging",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "reliability",
  },
  {
    message: "Analyze architecture from maintainability perspective",
    expectedGoal: "analyze architecture",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "maintainability",
  },
  {
    message: "Review rollout plan from scalability perspective",
    expectedGoal: "review rollout plan",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "scalability",
  },
  {
    message: "Implement tests with 2 tasks",
    expectedGoal: "implement tests",
    expectedTaskCount: 2,
    expectedIsAudit: false,
  },
  {
    message: "Build dashboard widgets with 9 tasks",
    expectedGoal: "build dashboard widgets",
    expectedTaskCount: 9,
    expectedIsAudit: false,
  },
  {
    message: "Create monitoring alerts",
    expectedGoal: "create monitoring alerts",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Audit release pipeline from risk perspective",
    expectedGoal: "audit release pipeline",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "risk",
  },
  {
    message: "Analyze CI setup from reliability perspective",
    expectedGoal: "analyze ci setup",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "reliability",
  },
  {
    message: "Review docs from clarity perspective",
    expectedGoal: "review docs",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "clarity",
  },
  {
    message: "Implement cache invalidation",
    expectedGoal: "implement cache invalidation",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Build retry strategy with 6 tasks",
    expectedGoal: "build retry strategy",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Create QA workflow",
    expectedGoal: "create qa workflow",
    expectedTaskCount: 6,
    expectedIsAudit: false,
  },
  {
    message: "Audit throughput from latency perspective",
    expectedGoal: "audit throughput",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "latency",
  },
  {
    message: "Analyze state transitions from correctness perspective",
    expectedGoal: "analyze state transitions",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "correctness",
  },
  {
    message: "Review templates from usability perspective",
    expectedGoal: "review templates",
    expectedTaskCount: 6,
    expectedIsAudit: true,
    expectedPerspective: "usability",
  },
];

function score(caseItem: ExtractionCase): number {
  const result = extractWorkflowParams({ userMessage: caseItem.message });
  let points = 0;
  let total = 3;

  if (result.goal === caseItem.expectedGoal) {
    points += 1;
  }
  if (result.taskCount === caseItem.expectedTaskCount) {
    points += 1;
  }
  if (result.isAudit === caseItem.expectedIsAudit) {
    points += 1;
  }

  if (caseItem.expectedPerspective !== undefined) {
    total += 1;
    if (result.perspective === caseItem.expectedPerspective) {
      points += 1;
    }
  }

  return points / total;
}

describe("extractWorkflowParams accuracy", () => {
  it("meets >90% extraction accuracy on varied prompts", () => {
    const scores = extractionCases.map((item) => score(item));
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    expect(extractionCases.length).toBeGreaterThanOrEqual(30);
    expect(average).toBeGreaterThanOrEqual(0.9);
  });
});
