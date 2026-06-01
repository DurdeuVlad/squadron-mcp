import { describe, expect, it } from "vitest";

import { detectQAContext } from "../../src/tools/detect-qa-context.js";

describe("detectQAContext", () => {
  it("detects TypeScript code context and framework", () => {
    const result = detectQAContext({
      filePath: "src/components/App.tsx",
      fileContent: "import React from 'react';",
    });

    expect(result.category).toBe("code");
    expect(result.subCategory).toBe("react");
    expect(result.language).toBe("typescript");
    expect(result.framework).toBe("react");
    expect(result.selectedPrompts.length).toBeGreaterThan(0);
  });

  it("detects documentation context", () => {
    const result = detectQAContext({
      filePath: "README.md",
      fileContent: "# Project",
    });

    expect(result.category).toBe("documentation");
    expect(result.subCategory).toBe("readme");
  });

  it("applies perspective overlays", () => {
    const result = detectQAContext({
      filePath: "src/index.ts",
      workflowPerspective: "security",
    });

    expect(result.perspective).toBe("security");
    expect(result.additionalPrompts.length).toBeGreaterThan(0);
  });
});
