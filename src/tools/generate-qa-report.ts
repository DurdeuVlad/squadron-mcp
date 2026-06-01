import type { QualityMetrics } from "../state/quality-tracker.js";
import type { WorkflowQAResult } from "./execute-workflow.js";

export function generateQAReport(qaResults: WorkflowQAResult[], metrics?: QualityMetrics): string {
  const totalChecks = qaResults.length;
  const passedChecks = qaResults.filter((result) => result.passed).length;
  const failedChecks = totalChecks - passedChecks;
  const averageQualityScore =
    totalChecks > 0
      ? qaResults.reduce((sum, result) => sum + result.qualityScore, 0) / totalChecks
      : 0;

  const criticalFailures = qaResults.filter(
    (result) => result.severity === "critical" && !result.passed
  ).length;

  const lines: string[] = [
    "# Quality Assurance Report",
    "",
    "## Overall",
    `- Checks performed: ${totalChecks}`,
    `- Passed: ${passedChecks}`,
    `- Failed: ${failedChecks}`,
    `- Average quality score: ${averageQualityScore.toFixed(1)}/10`,
    `- Critical failures: ${criticalFailures}`,
  ];

  if (metrics) {
    lines.push(`- Workflow score: ${metrics.averageQualityScore.toFixed(1)}/10`);
    lines.push(`- Workflow pass rate: ${((metrics.passedChecks / Math.max(1, metrics.totalChecks)) * 100).toFixed(0)}%`);
  }

  const failures = qaResults.filter((result) => !result.passed);
  if (failures.length > 0) {
    lines.push("", "## Failed Checks");
    for (const failure of failures) {
      lines.push(
        `- ${failure.stage} (${failure.context.category}${
          failure.context.subCategory ? `/${failure.context.subCategory}` : ""
        }) - score ${failure.qualityScore}/10, severity ${failure.severity}`
      );
      for (const issue of failure.issues) {
        lines.push(`  - Issue: ${issue}`);
      }
      for (const mitigation of failure.mitigations) {
        lines.push(`  - Mitigation: ${mitigation}`);
      }
    }
  }

  lines.push("", "## Detailed Results");
  qaResults.forEach((result, index) => {
    lines.push(
      `${index + 1}. ${result.passed ? "PASS" : "FAIL"} ${result.stage} (${result.context.category}) - ${
        result.qualityScore
      }/10`
    );
  });

  return lines.join("\n");
}
