# Task 2: Workflow Parameter Extraction

**Sprint:** 006-B  
**Complexity:** Low-Medium  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 1 (classify_intent)

---

## Goal

Extract structured workflow parameters from natural language:
- **goal**: Main objective ("implement X", "audit Y")
- **perspective**: For audits ("from performance perspective")
- **taskCount**: Number of tasks (default: 6)
- **isAudit**: Boolean flag

---

## Inputs

- User message (string)
- Classification result from Task 1 (optional)

---

## Implementation

**File:** `src/tools/extract-workflow-params.ts`

```typescript
import { z } from 'zod';

export const ExtractWorkflowParamsInputSchema = z.object({
  userMessage: z.string(),
  classification: z.any().optional() // From classify_intent
});

export interface WorkflowParams {
  goal: string;
  perspective?: string;
  taskCount: number;
  isAudit: boolean;
  template: string;
  confidence: number; // How confident we are in extraction
}

export async function extractWorkflowParams(
  input: ExtractWorkflowParamsInput
): Promise<WorkflowParams> {
  const message = input.userMessage;
  
  // Extract goal (main action + subject)
  const goal = extractGoal(message);
  
  // Extract perspective (for audits)
  const perspective = extractPerspective(message);
  
  // Extract task count
  const taskCount = extractTaskCount(message) || 6; // Default to 6
  
  // Detect audit mode
  const isAudit = /audit|analyze|review/i.test(message);
  
  // Determine template
  const template = determineTemplate(isAudit, perspective, input.classification);
  
  // Calculate extraction confidence
  const confidence = calculateExtractionConfidence(goal, message);
  
  return {
    goal,
    perspective,
    taskCount,
    isAudit,
    template,
    confidence
  };
}

function extractGoal(message: string): string {
  // Remove common prefixes
  let goal = message
    .replace(/^(please|can you|could you|i want to|i need to)/i, '')
    .trim();
  
  // Extract action + subject pattern
  const actionPattern = /(implement|build|create|audit|analyze|improve|refactor|fix|optimize|add)\s+(.+?)(\s+from|\s+with|\s*$)/i;
  const match = goal.match(actionPattern);
  
  if (match) {
    return `${match[1].toLowerCase()} ${match[2].trim()}`;
  }
  
  return goal;
}

function extractPerspective(message: string): string | undefined {
  // Pattern: "from X perspective" or "X audit"
  const perspectivePattern = /from\s+([a-z]+)\s+perspective/i;
  const match = message.match(perspectivePattern);
  
  if (match) {
    return match[1];
  }
  
  // Alternative pattern: "performance audit"
  const altPattern = /([a-z]+)\s+audit/i;
  const altMatch = message.match(altPattern);
  
  if (altMatch) {
    return altMatch[1];
  }
  
  return undefined;
}

function extractTaskCount(message: string): number | undefined {
  // Pattern: "6 tasks", "with 8 tasks", "10-task sprint"
  const countPattern = /(\d+)[\s-]tasks?/i;
  const match = message.match(countPattern);
  
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return undefined;
}

function determineTemplate(
  isAudit: boolean,
  perspective: string | undefined,
  classification: any
): string {
  if (isAudit) {
    return 'audit-workflow';
  }
  
  if (classification?.suggestedTemplate) {
    return classification.suggestedTemplate;
  }
  
  return 'user-standard-workflow';
}

function calculateExtractionConfidence(goal: string, originalMessage: string): number {
  let confidence = 0.5; // Base confidence
  
  // Boost if goal is clear and specific
  if (goal.length > 10 && goal.split(' ').length >= 2) {
    confidence += 0.3;
  }
  
  // Boost if contains concrete action verb
  if (/implement|build|create|audit|analyze/i.test(goal)) {
    confidence += 0.2;
  }
  
  // Penalty if very short or ambiguous
  if (goal.length < 5 || goal === originalMessage) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}
```

---

## Testing

**File:** `tests/tools/extract-workflow-params.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { extractWorkflowParams } from '../../src/tools/extract-workflow-params';

describe('extract_workflow_params', () => {
  it('extracts goal from clear message', async () => {
    const result = await extractWorkflowParams({
      userMessage: 'Implement video format templates'
    });
    
    expect(result.goal).toBe('implement video format templates');
    expect(result.isAudit).toBe(false);
    expect(result.taskCount).toBe(6);
  });
  
  it('extracts perspective from audit request', async () => {
    const result = await extractWorkflowParams({
      userMessage: 'Audit debate quality from fairness perspective'
    });
    
    expect(result.goal).toBe('audit debate quality');
    expect(result.perspective).toBe('fairness');
    expect(result.isAudit).toBe(true);
    expect(result.template).toBe('audit-workflow');
  });
  
  it('extracts task count', async () => {
    const result = await extractWorkflowParams({
      userMessage: 'Implement authentication with 8 tasks'
    });
    
    expect(result.taskCount).toBe(8);
  });
  
  it('uses default task count when not specified', async () => {
    const result = await extractWorkflowParams({
      userMessage: 'Build user dashboard'
    });
    
    expect(result.taskCount).toBe(6);
  });
  
  it('handles alternative perspective patterns', async () => {
    const result = await extractWorkflowParams({
      userMessage: 'Performance audit of API endpoints'
    });
    
    expect(result.perspective).toBe('performance');
    expect(result.isAudit).toBe(true);
  });
});
```

---

## Expected Outputs

1. **extract_workflow_params** function
2. Structured WorkflowParams object
3. Confidence scoring for extraction quality
4. Test suite with >90% accuracy

---

## Success Criteria

- ✅ Extracts goal correctly in >90% of test cases
- ✅ Detects perspective patterns accurately
- ✅ Handles missing parameters gracefully (defaults)
- ✅ Confidence scoring is meaningful
- ✅ All tests pass

---

## Time Estimate

- Implementation: 2 hours
- Testing and tuning: 1-2 hours

**Total: 3-4 hours**
