export interface QualityReportInput {
  status?: "in_progress" | "completed" | "failed";
  issues?: string[];
  metrics?: {
    testsPassed?: number;
    testsTotal?: number;
    buildSuccess?: boolean;
  };
}

export interface QualityGate {
  name: string;
  check: (report: QualityReportInput) => boolean;
  message: string;
}

export const DEFAULT_QUALITY_GATES: QualityGate[] = [
  {
    name: "tests-passing",
    check: (report) => {
      const testsTotal = report.metrics?.testsTotal;
      const testsPassed = report.metrics?.testsPassed;
      if (testsTotal === undefined && testsPassed === undefined) {
        return true;
      }
      if (!testsTotal || testsTotal <= 0) {
        return false;
      }
      return testsPassed === testsTotal;
    },
    message: "All tests must pass when test metrics are provided.",
  },
  {
    name: "build-success",
    check: (report) => {
      if (report.metrics?.buildSuccess === undefined) {
        return true;
      }
      return report.metrics.buildSuccess === true;
    },
    message: "Build must succeed when build metrics are provided.",
  },
  {
    name: "no-critical-issues",
    check: (report) => {
      return !report.issues?.some((issue) => issue.toUpperCase().includes("CRITICAL"));
    },
    message: "No critical issues allowed in completion reports.",
  },
];

export function runQualityGates(
  report: QualityReportInput,
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
