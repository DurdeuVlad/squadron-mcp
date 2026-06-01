import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { QA_PROMPTS } from "../../src/config/qa-prompts.js";

function countPromptSets(): number {
  return Object.values(QA_PROMPTS).reduce((total, category) => total + Object.keys(category).length, 0);
}

describe("QA prompt library completeness", () => {
  it("includes at least 50 prompt sets across categories", () => {
    expect(countPromptSets()).toBeGreaterThanOrEqual(50);
  });

  it("keeps the JSON artifact at 800+ lines", () => {
    const lines = readFileSync("src/config/qa-prompts.json", "utf8").split(/\r?\n/).length;
    expect(lines).toBeGreaterThanOrEqual(800);
  });
});
