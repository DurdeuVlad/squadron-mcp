import { describe, expect, it } from "vitest";

import { injectQAPrompts } from "../../src/tools/inject-qa-prompts.js";

describe("injectQAPrompts", () => {
  it("builds prompts and full checklist for code files", () => {
    const result = injectQAPrompts({
      filePath: "src/tools/example.ts",
      fileContent: "export const x = 1;",
    });

    expect(result.context.category).toBe("code");
    expect(result.prompts.length).toBeGreaterThan(0);
    expect(result.fullPrompt).toContain("Quality Assurance Checklist");
    expect(result.severity).toBe("high");
  });

  it("raises severity from perspective overlay", () => {
    const result = injectQAPrompts({
      filePath: "docs/readme.md",
      workflowPerspective: "security",
    });

    expect(result.severity).toBe("critical");
    expect(result.prompts.some((prompt) => prompt.toLowerCase().includes("owasp"))).toBe(true);
  });
});
