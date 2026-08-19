# Task 4: Context-Aware Intelligence

**Sprint:** 006-D  
**Complexity:** Medium  
**Estimated Time:** 3-5 hours  
**Dependencies:** Task 1, Task 2, Task 3

---

## Goal

Make auto-orchestration smarter by detecting and using context:
- Current file path (detect sprint folder, test folder, etc.)
- Repository state (uncommitted changes, current branch)
- Recent activity (last command, recent files)

Use context to:
- Boost classification confidence
- Infer workflow parameters
- Suggest appropriate templates
- Provide smart defaults

---

## Inputs

- User message
- VS Code workspace context
- File system context

---

## Implementation

**File:** `src/tools/detect-context.ts`

```typescript
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

export interface WorkspaceContext {
  currentFile?: string;
  currentFolder?: string;
  inSprintFolder: boolean;
  sprintNumber?: number;
  sprintGoal?: string;
  inTestFolder: boolean;
  inDocsFolder: boolean;
  recentFiles?: string[];
  suggestedTemplate?: string;
  suggestedGoal?: string;
  confidenceBoost: number; // -0.2 to +0.2
}

export async function detectContext(input: {
  currentFile?: string;
  currentFolder?: string;
}): Promise<WorkspaceContext> {
  const context: WorkspaceContext = {
    currentFile: input.currentFile,
    currentFolder: input.currentFolder,
    inSprintFolder: false,
    inTestFolder: false,
    inDocsFolder: false,
    confidenceBoost: 0
  };
  
  if (!input.currentFolder) {
    return context;
  }
  
  const folder = input.currentFolder.toLowerCase();
  
  // Detect sprint folder
  const sprintMatch = folder.match(/sprints?[\/\\]sprint-?(\d+)[\/\\]?([^\/\\]*)/i);
  if (sprintMatch) {
    context.inSprintFolder = true;
    context.sprintNumber = parseInt(sprintMatch[1], 10);
    context.sprintGoal = sprintMatch[2]?.replace(/-/g, ' ') || 'unknown';
    context.suggestedTemplate = 'continue-sprint';
    context.suggestedGoal = `continue sprint ${context.sprintNumber} - ${context.sprintGoal}`;
    context.confidenceBoost = 0.15; // Boost confidence in sprint folder
  }
  
  // Detect test folder
  if (folder.includes('test') || folder.includes('spec')) {
    context.inTestFolder = true;
    context.suggestedTemplate = 'write-tests';
    context.confidenceBoost = 0.10;
  }
  
  // Detect docs folder
  if (folder.includes('doc')) {
    context.inDocsFolder = true;
    context.suggestedTemplate = 'update-docs';
    context.confidenceBoost = 0.10;
  }
  
  return context;
}

export function applyContextToClassification(
  classification: any,
  context: WorkspaceContext
): any {
  const boostedConfidence = Math.min(1.0, classification.confidence + context.confidenceBoost);
  
  return {
    ...classification,
    confidence: boostedConfidence,
    context,
    suggestedTemplate: context.suggestedTemplate || classification.suggestedTemplate
  };
}

export function applyContextToParams(
  params: any,
  context: WorkspaceContext
): any {
  // If goal is ambiguous and we have context suggestion, use it
  if (params.confidence < 0.7 && context.suggestedGoal) {
    return {
      ...params,
      goal: context.suggestedGoal,
      confidence: Math.min(0.85, params.confidence + 0.2),
      contextInferred: true
    };
  }
  
  // If in sprint folder, use continue-sprint template
  if (context.inSprintFolder && !params.template) {
    return {
      ...params,
      template: 'continue-sprint',
      sprintNumber: context.sprintNumber,
      sprintGoal: context.sprintGoal
    };
  }
  
  return params;
}
```

**File:** `src/config/context-rules.json`

```json
{
  "folderPatterns": {
    "sprints/": {
      "suggestedTemplate": "continue-sprint",
      "confidenceBoost": 0.15,
      "keywords": ["continue", "sprint", "task"]
    },
    "tests/": {
      "suggestedTemplate": "write-tests",
      "confidenceBoost": 0.10,
      "keywords": ["test", "spec", "coverage"]
    },
    "docs/": {
      "suggestedTemplate": "update-docs",
      "confidenceBoost": 0.10,
      "keywords": ["document", "readme", "guide"]
    },
    "src/": {
      "suggestedTemplate": "user-standard-workflow",
      "confidenceBoost": 0.05,
      "keywords": ["implement", "refactor", "optimize"]
    }
  },
  "filePatterns": {
    ".test.ts": "write-tests",
    ".spec.ts": "write-tests",
    "README.md": "update-docs",
    "sprint.md": "continue-sprint"
  }
}
```

---

## Integration with Auto-Orchestrate

**Update `src/tools/auto-orchestrate.ts`:**

```typescript
import { detectContext, applyContextToClassification, applyContextToParams } from './detect-context.js';

export async function autoOrchestrate(
  input: AutoOrchestrateInput
): Promise<AutoOrchestrateResult> {
  const config = loadAutoTriggerConfig();
  
  // Step 0: Detect workspace context
  const context = await detectContext({
    currentFile: input.context?.currentFile,
    currentFolder: input.context?.currentFolder
  });
  
  // Step 1: Classify intent
  let classification = await classifyIntent({
    userMessage: input.userMessage,
    context: input.context
  });
  
  // Apply context boost to classification
  classification = applyContextToClassification(classification, context);
  
  // Step 2: If not workflow candidate, return early
  if (classification.type !== 'workflow-candidate') {
    return {
      decision: classification.recommendedAction,
      confidence: classification.confidence,
      classification,
      context // Include context in result
    };
  }
  
  // Step 3: Extract workflow parameters
  let workflowParams = await extractWorkflowParams({
    userMessage: input.userMessage,
    classification
  });
  
  // Apply context to params
  workflowParams = applyContextToParams(workflowParams, context);
  
  // Rest of the logic remains the same...
}
```

---

## Testing

**File:** `tests/tools/detect-context.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { detectContext, applyContextToClassification } from '../../src/tools/detect-context';

describe('detect_context', () => {
  it('detects sprint folder context', async () => {
    const context = await detectContext({
      currentFolder: 'c:/workspace/sprints/sprint-014-format-templates'
    });
    
    expect(context.inSprintFolder).toBe(true);
    expect(context.sprintNumber).toBe(14);
    expect(context.sprintGoal).toBe('format templates');
    expect(context.suggestedTemplate).toBe('continue-sprint');
    expect(context.confidenceBoost).toBeGreaterThan(0);
  });
  
  it('detects test folder context', async () => {
    const context = await detectContext({
      currentFolder: 'c:/workspace/tests/integration'
    });
    
    expect(context.inTestFolder).toBe(true);
    expect(context.suggestedTemplate).toBe('write-tests');
  });
  
  it('boosts confidence in sprint folder', async () => {
    const context = await detectContext({
      currentFolder: 'sprints/sprint-006-auto-orchestration'
    });
    
    const classification = {
      type: 'workflow-candidate',
      confidence: 0.75
    };
    
    const boosted = applyContextToClassification(classification, context);
    
    expect(boosted.confidence).toBeGreaterThan(0.75);
    expect(boosted.confidence).toBeLessThanOrEqual(1.0);
  });
  
  it('infers goal from sprint context', async () => {
    const context = await detectContext({
      currentFolder: 'sprints/sprint-014-format-templates'
    });
    
    expect(context.suggestedGoal).toContain('sprint 014');
    expect(context.suggestedGoal).toContain('format templates');
  });
});
```

---

## User Experience Examples

### Example 1: In Sprint Folder

```
User: "Continue this"
Location: sprints/sprint-014-format-templates/

AI (thinking):
  - Context: In sprint-014-format-templates
  - Detected: Sprint 014 - Format Templates
  - Goal inferred: "continue sprint 014 - format templates"
  - Confidence: 0.80 + 0.15 (context boost) = 0.95
  - Decision: Auto-trigger

AI: "🚀 Continuing Sprint 014: Format Templates
     
     Detected from folder context.
     Resuming workflow from last checkpoint..."
```

### Example 2: Ambiguous Message with Context

```
User: "Implement this"
Location: sprints/sprint-006-auto-orchestration/task-4-context-detection.md

AI (thinking):
  - Context: In sprint-006 folder
  - Message ambiguous but context clear
  - Goal: "implement task 4 - context detection"
  - Confidence boosted from 0.65 → 0.80
  - Decision: Ask confirmation (below 0.95)

AI: "Detected from context: Sprint 006 - Auto Orchestration
     Task 4: Context Detection
     
     Should I implement this task? [Auto-confirm in 3s]"
```

---

## Expected Outputs

1. **Context detection system** - File/folder awareness
2. **Confidence boosting** - Context-aware scoring
3. **Smart parameter inference** - Fill in missing details
4. **Template suggestions** - Context-appropriate workflows

---

## Success Criteria

- ✅ Detects sprint folders with 100% accuracy
- ✅ Boosts confidence appropriately (10-15%)
- ✅ Infers goals from context when message ambiguous
- ✅ Suggests correct templates based on location
- ✅ All tests pass

---

## Time Estimate

- Context detection: 2 hours
- Integration with classification: 1 hour
- Parameter inference: 1 hour
- Testing: 1-2 hours

**Total: 3-5 hours**
