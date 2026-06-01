# Task 1: Intent Classification System

**Sprint:** 006-A  
**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Dependencies:** None

---

## Goal

Build MCP tool that classifies user messages into:
- **simple-question**: "What is X?", "How does Y work?"
- **complex-task**: "Create a script for X"
- **workflow-candidate**: "Implement X", "Audit Y from Z perspective"

---

## Inputs

- User message (string)
- Optional context (current file, folder, repo state)

---

## Implementation Steps

### 1. Create Classification Tool Structure

**File:** `src/tools/classify-intent.ts`

```typescript
import { z } from 'zod';

export const ClassifyIntentInputSchema = z.object({
  userMessage: z.string(),
  context: z.object({
    currentFile: z.string().optional(),
    currentFolder: z.string().optional(),
    repoState: z.any().optional()
  }).optional()
});

export type ClassifyIntentInput = z.infer<typeof ClassifyIntentInputSchema>;

export interface IntentClassification {
  type: 'simple-question' | 'complex-task' | 'workflow-candidate';
  confidence: number; // 0-1
  recommendedAction: 'answer-directly' | 'use-mcp-tool' | 'trigger-workflow';
  detectedGoal?: string;
  suggestedTemplate?: string;
  reasoning: string;
}
```

### 2. Define Classification Pattern Rules

**File:** `src/config/classification-rules.json`

```json
{
  "workflowTriggers": {
    "patterns": [
      {
        "regex": "implement|build|create|add feature",
        "weight": 0.9,
        "suggestedTemplate": "user-standard-workflow"
      },
      {
        "regex": "audit|analyze|review.*from.*perspective",
        "weight": 0.95,
        "suggestedTemplate": "audit-workflow"
      },
      {
        "regex": "sprint|multiple tasks|series of",
        "weight": 0.85,
        "suggestedTemplate": "user-standard-workflow"
      },
      {
        "regex": "improve|refactor|optimize|fix all",
        "weight": 0.80,
        "suggestedTemplate": "user-standard-workflow"
      },
      {
        "regex": "run.*workflow|standard process|my usual|automate this",
        "weight": 1.0,
        "suggestedTemplate": "user-standard-workflow"
      }
    ]
  },
  "simpleQuestions": {
    "patterns": [
      {
        "regex": "what is|what are|what does",
        "weight": 0.95
      },
      {
        "regex": "how does|how do|how to",
        "weight": 0.90
      },
      {
        "regex": "explain|tell me about|describe",
        "weight": 0.92
      },
      {
        "regex": "why|when should|which one|where",
        "weight": 0.88
      },
      {
        "regex": "show me|give me an example|list",
        "weight": 0.85
      }
    ]
  },
  "complexTasks": {
    "patterns": [
      {
        "regex": "create a script|write a function",
        "weight": 0.75
      },
      {
        "regex": "update|modify|change this file",
        "weight": 0.70
      },
      {
        "regex": "debug|fix this issue|troubleshoot",
        "weight": 0.65
      }
    ]
  }
}
```

### 3. Implement Classification Logic

```typescript
export async function classifyIntent(
  input: ClassifyIntentInput
): Promise<IntentClassification> {
  const message = input.userMessage.toLowerCase();
  
  // Load classification rules
  const rules = loadClassificationRules();
  
  // Score against each category
  const scores = {
    workflow: calculateScore(message, rules.workflowTriggers.patterns),
    simpleQuestion: calculateScore(message, rules.simpleQuestions.patterns),
    complexTask: calculateScore(message, rules.complexTasks.patterns)
  };
  
  // Determine intent based on highest score
  const maxScore = Math.max(...Object.values(scores));
  const confidence = maxScore;
  
  let type: IntentClassification['type'];
  let recommendedAction: IntentClassification['recommendedAction'];
  let suggestedTemplate: string | undefined;
  
  if (scores.workflow === maxScore && maxScore > 0.75) {
    type = 'workflow-candidate';
    recommendedAction = 'trigger-workflow';
    suggestedTemplate = detectTemplate(message, rules.workflowTriggers.patterns);
  } else if (scores.simpleQuestion === maxScore && maxScore > 0.80) {
    type = 'simple-question';
    recommendedAction = 'answer-directly';
  } else if (scores.complexTask === maxScore) {
    type = 'complex-task';
    recommendedAction = 'use-mcp-tool';
  } else {
    // Default to simple question for low confidence
    type = 'simple-question';
    recommendedAction = 'answer-directly';
  }
  
  return {
    type,
    confidence,
    recommendedAction,
    suggestedTemplate,
    reasoning: generateReasoning(scores, type, confidence)
  };
}

function calculateScore(message: string, patterns: Array<{regex: string; weight: number}>): number {
  let maxScore = 0;
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, 'i');
    if (regex.test(message)) {
      maxScore = Math.max(maxScore, pattern.weight);
    }
  }
  
  return maxScore;
}

function detectTemplate(message: string, patterns: any[]): string {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, 'i');
    if (regex.test(message) && pattern.suggestedTemplate) {
      return pattern.suggestedTemplate;
    }
  }
  return 'user-standard-workflow'; // Default
}

function generateReasoning(scores: any, type: string, confidence: number): string {
  return `Classified as ${type} with ${(confidence * 100).toFixed(0)}% confidence. ` +
         `Scores: workflow=${scores.workflow.toFixed(2)}, ` +
         `question=${scores.simpleQuestion.toFixed(2)}, ` +
         `task=${scores.complexTask.toFixed(2)}`;
}
```

### 4. Register MCP Tool

**File:** `src/index.ts`

```typescript
import { classifyIntent } from './tools/classify-intent.js';

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... existing tools ...
    {
      name: 'classify_intent',
      description: 'Classify user message intent to determine if workflow should be triggered',
      inputSchema: zodToJsonSchema(ClassifyIntentInputSchema)
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'classify_intent') {
    const input = ClassifyIntentInputSchema.parse(request.params.arguments);
    const result = await classifyIntent(input);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
  // ... handle other tools ...
});
```

---

## Testing

**File:** `tests/tools/classify-intent.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../src/tools/classify-intent';

describe('classify_intent', () => {
  it('detects workflow requests', async () => {
    const result = await classifyIntent({
      userMessage: 'Implement format templates for debates'
    });
    
    expect(result.type).toBe('workflow-candidate');
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.recommendedAction).toBe('trigger-workflow');
  });
  
  it('detects simple questions', async () => {
    const result = await classifyIntent({
      userMessage: 'What are format templates?'
    });
    
    expect(result.type).toBe('simple-question');
    expect(result.confidence).toBeGreaterThan(0.90);
    expect(result.recommendedAction).toBe('answer-directly');
  });
  
  it('detects audit workflows', async () => {
    const result = await classifyIntent({
      userMessage: 'Audit debate quality from fairness perspective'
    });
    
    expect(result.type).toBe('workflow-candidate');
    expect(result.suggestedTemplate).toBe('audit-workflow');
  });
  
  it('handles ambiguous messages', async () => {
    const result = await classifyIntent({
      userMessage: 'Format templates'
    });
    
    expect(result.confidence).toBeLessThan(0.80);
  });
});
```

---

## Expected Outputs

1. **classify_intent MCP Tool**
   - Registered and callable
   - Returns structured classification
   - Includes confidence and reasoning

2. **Classification Rules Config**
   - JSON file with tunable patterns
   - Weights for each pattern
   - Template mappings

3. **Test Suite**
   - >80% accuracy on test cases
   - Covers edge cases
   - Validates confidence scoring

---

## Success Criteria

- ✅ Tool classifies workflow requests with >80% accuracy
- ✅ Tool classifies simple questions with >95% accuracy
- ✅ Confidence scores are meaningful and tunable
- ✅ Template suggestions are appropriate
- ✅ All tests pass
- ✅ Code follows TypeScript best practices

---

## Example Usage

```typescript
// From GitHub Copilot or another MCP client:

const result = await tools.classify_intent({
  userMessage: "Implement video format templates",
  context: {
    currentFolder: "sprints/sprint-014-format-templates"
  }
});

console.log(result);
// {
//   type: 'workflow-candidate',
//   confidence: 0.92,
//   recommendedAction: 'trigger-workflow',
//   detectedGoal: 'implement video format templates',
//   suggestedTemplate: 'user-standard-workflow',
//   reasoning: 'Classified as workflow-candidate with 92% confidence...'
// }
```

---

## Time Estimate

- Setup and structure: 1 hour
- Classification logic: 2 hours
- Pattern rules and tuning: 1 hour
- Testing: 1-2 hours
- Integration and polish: 1 hour

**Total: 4-6 hours**
