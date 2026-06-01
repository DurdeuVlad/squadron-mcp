import { describe, expect, it } from "vitest";

import {
  buildSelfReviewPrompt,
  parseSelfReviewResponse,
  performSelfReview,
} from "../../src/tools/self-review.js";

describe("self-review", () => {
  it("builds structured self-review prompts", () => {
    const prompt = buildSelfReviewPrompt({
      taskType: "execution",
      output: { status: "ok" },
      qaPrompts: ["Check correctness"],
      agent: "gemini",
    });

    expect(prompt).toContain("Self-Review Task");
    expect(prompt).toContain("execution");
    expect(prompt).toContain("Check correctness");
  });

  it("parses structured review responses", () => {
    const parsed = parseSelfReviewResponse(`
Quality Score: 8
Issues Found:
- Missing edge case test
Mitigations:
- Added a regression test
Confidence: high
Recommendations:
- Improve docs
`);

    expect(parsed.qualityScore).toBe(8);
    expect(parsed.issues).toContain("Missing edge case test");
    expect(parsed.mitigations).toContain("Added a regression test");
    expect(parsed.confidence).toBeGreaterThan(0.8);
    expect(parsed.recommendations).toContain("Improve docs");
  });

  it("flags obvious quality issues in heuristic self-review", async () => {
    const result = await performSelfReview({
      taskType: "execution",
      output: "TODO: implement",
      qaPrompts: ["Verify correctness", "Verify tests"],
      agent: "codex",
      initialIssues: ["Automated check failed: npm test"],
    });

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.qualityScore).toBeLessThan(9);
  });
});
