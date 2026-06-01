import { describe, expect, it } from "vitest";

import { generateQAReport } from "../../src/tools/generate-qa-report.js";

describe("generateQAReport", () => {
  it("produces an actionable markdown report", () => {
    const report = generateQAReport([
      {
        stage: "planning",
        context: {
          category: "code",
          subCategory: "typescript",
          fileExtension: ".ts",
          filePath: "src/main.ts",
          selectedPrompts: [],
          automatedChecks: [],
          additionalPrompts: [],
        },
        severity: "high",
        passed: true,
        qualityScore: 8,
        issues: [],
        mitigations: [],
        confidence: 0.8,
        recommendations: [],
        automatedChecks: [],
        timestamp: new Date().toISOString(),
      },
      {
        stage: "review",
        context: {
          category: "documentation",
          subCategory: "readme",
          fileExtension: ".md",
          filePath: "README.md",
          selectedPrompts: [],
          automatedChecks: [],
          additionalPrompts: [],
        },
        severity: "critical",
        passed: false,
        qualityScore: 6,
        issues: ["Security section missing"],
        mitigations: ["Add threat model summary"],
        confidence: 0.7,
        recommendations: [],
        automatedChecks: [],
        timestamp: new Date().toISOString(),
      },
    ]);

    expect(report).toContain("Quality Assurance Report");
    expect(report).toContain("Checks performed: 2");
    expect(report).toContain("Failed Checks");
    expect(report).toContain("Security section missing");
  });
});
