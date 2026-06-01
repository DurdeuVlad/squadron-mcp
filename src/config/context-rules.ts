export interface ContextRule {
  suggestedTemplate: string;
  confidenceBoost: number;
}

export interface ContextRules {
  folderPatterns: Record<string, ContextRule>;
  filePatterns: Record<string, string>;
}

export const CONTEXT_RULES: ContextRules = {
  folderPatterns: {
    "sprints/": {
      suggestedTemplate: "continue-sprint",
      confidenceBoost: 0.15,
    },
    "tests/": {
      suggestedTemplate: "write-tests",
      confidenceBoost: 0.1,
    },
    "docs/": {
      suggestedTemplate: "update-docs",
      confidenceBoost: 0.1,
    },
    "src/": {
      suggestedTemplate: "user-standard-workflow",
      confidenceBoost: 0.05,
    },
  },
  filePatterns: {
    ".test.ts": "write-tests",
    ".spec.ts": "write-tests",
    "README.md": "update-docs",
  },
};
