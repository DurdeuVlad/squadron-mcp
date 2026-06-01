import { describe, expect, it } from "vitest";

import { ProgressReporter } from "../../src/tools/progress-reporter.js";

describe("ProgressReporter", () => {
  it("records updates and formats output", () => {
    const reporter = new ProgressReporter(3);
    const update = reporter.report(1, "Start", "in-progress");
    reporter.report(1, "Done", "completed");

    expect(reporter.getUpdates()).toHaveLength(2);
    expect(reporter.formatUpdate(update)).toContain("[1/3]");
    expect(reporter.summary()).toContain("completed");
  });
});
