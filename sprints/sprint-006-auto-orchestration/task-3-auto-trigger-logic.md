# Task 3: Auto-Trigger Logic & Confirmation Flow

**Sprint:** 006-C  
**Complexity:** Medium-High  
**Estimated Time:** 4-6 hours  
**Dependencies:** Task 1 (classify_intent), Task 2 (extract_workflow_params)

---

## Goal

Build the intelligent decision maker that:
1. Combines intent classification + parameter extraction
2. Decides whether to trigger workflow automatically
3. Handles confirmation flow for medium-confidence requests
4. Respects YOLO mode and configuration thresholds

---

## Inputs

- User message
- Optional context

---

## Implementation

**File:** `src/tools/auto-orchestrate.ts`

```typescript
import { z } from 'zod';
import { classifyIntent } from './classify-intent.js';
import { extractWorkflowParams } from './extract-workflow-params.js';
import { executeWorkflow } from './execute-workflow.js';

export const AutoOrchestrateInputSchema = z.object({
  userMessage: z.string(),
  context: z.object({
    currentFile: z.string().optional(),
    currentFolder: z.string().optional()
  }).optional()
});

export interface AutoOrchestrateResult {
  decision: 'trigger-workflow' | 'ask-confirmation' | 'answer-directly' | 'use-tool';
  confidence: number;
  classification: any;
  workflowParams?: any;
  confirmationMessage?: string;
  workflowResult?: any;
}

export async function autoOrchestrate(
  input: AutoOrchestrateInput
): Promise<AutoOrchestrateResult> {
  const config = loadAutoTriggerConfig();
  
  // Step 1: Classify intent
  const classification = await classifyIntent({
    userMessage: input.userMessage,
    context: input.context
  });
  
  // Step 2: If not workflow candidate, return early
  if (classification.type !== 'workflow-candidate') {
    return {
      decision: classification.recommendedAction,
      confidence: classification.confidence,
      classification
    };
  }
  
  // Step 3: Extract workflow parameters
  const workflowParams = await extractWorkflowParams({
    userMessage: input.userMessage,
    classification
  });
  
  // Combine confidences (average)
  const combinedConfidence = (classification.confidence + workflowParams.confidence) / 2;
  
  // Step 4: Make decision based on confidence
  const decision = makeDecision(combinedConfidence, config);
  
  // Step 5: Execute based on decision
  if (decision === 'trigger-workflow') {
    // Auto-trigger workflow
    const workflowResult = await executeWorkflow({
      template: workflowParams.template,
      goal: workflowParams.goal,
      perspective: workflowParams.perspective,
      taskCount: workflowParams.taskCount
    });
    
    return {
      decision,
      confidence: combinedConfidence,
      classification,
      workflowParams,
      workflowResult
    };
  } else if (decision === 'ask-confirmation') {
    // Generate confirmation message
    const confirmationMessage = generateConfirmationMessage(workflowParams);
    
    return {
      decision,
      confidence: combinedConfidence,
      classification,
      workflowParams,
      confirmationMessage
    };
  } else {
    return {
      decision: 'answer-directly',
      confidence: combinedConfidence,
      classification,
      workflowParams
    };
  }
}

function makeDecision(confidence: number, config: any): string {
  const yoloConfidence = config.YOLO_MODE_CONFIDENCE || 0.95;
  const minConfidence = config.AUTO_TRIGGER_CONFIDENCE || 0.80;
  const askFirst = config.AUTO_TRIGGER_ASK_FIRST === 'true';
  
  if (confidence >= yoloConfidence) {
    // Very high confidence - auto-trigger even if askFirst is true
    return 'trigger-workflow';
  } else if (confidence >= minConfidence) {
    // Medium-high confidence
    if (askFirst) {
      return 'ask-confirmation';
    } else {
      return 'trigger-workflow';
    }
  } else {
    // Too uncertain - don't trigger workflow
    return 'answer-directly';
  }
}

function generateConfirmationMessage(params: any): string {
  return `I detected this as a workflow task with ${(params.confidence * 100).toFixed(0)}% confidence.

Should I trigger the workflow?

**Goal:** ${params.goal}
**Template:** ${params.template}
**Tasks:** ${params.taskCount}
${params.perspective ? `**Perspective:** ${params.perspective}` : ''}

Options:
A) Yes, run the workflow ← [Auto-selected in 3s]
B) No, just answer my question
C) Show me more details first

[Waiting for confirmation...]`;
}

function loadAutoTriggerConfig() {
  return {
    AUTO_TRIGGER_WORKFLOWS: process.env.AUTO_TRIGGER_WORKFLOWS !== 'false',
    AUTO_TRIGGER_CONFIDENCE: parseFloat(process.env.AUTO_TRIGGER_CONFIDENCE || '0.8'),
    AUTO_TRIGGER_ASK_FIRST: process.env.AUTO_TRIGGER_ASK_FIRST || 'true',
    YOLO_MODE_CONFIDENCE: parseFloat(process.env.YOLO_MODE_CONFIDENCE || '0.95'),
    CONFIRMATION_TIMEOUT: parseInt(process.env.CONFIRMATION_TIMEOUT || '3000', 10)
  };
}
```

**File:** `src/config/auto-trigger-config.ts`

```typescript
export interface AutoTriggerConfig {
  enabled: boolean;
  minConfidence: number;
  yoloConfidence: number;
  askFirst: boolean;
  confirmationTimeout: number;
}

export function getAutoTriggerConfig(): AutoTriggerConfig {
  return {
    enabled: process.env.AUTO_TRIGGER_WORKFLOWS !== 'false',
    minConfidence: parseFloat(process.env.AUTO_TRIGGER_CONFIDENCE || '0.8'),
    yoloConfidence: parseFloat(process.env.YOLO_MODE_CONFIDENCE || '0.95'),
    askFirst: process.env.AUTO_TRIGGER_ASK_FIRST === 'true',
    confirmationTimeout: parseInt(process.env.CONFIRMATION_TIMEOUT || '3000', 10)
  };
}
```

---

## Configuration

**Add to `.env.example`:**

```bash
# Auto-Orchestration Settings
AUTO_TRIGGER_WORKFLOWS=true           # Enable intelligent auto-triggering
AUTO_TRIGGER_CONFIDENCE=0.8           # Minimum confidence to consider (0-1)
AUTO_TRIGGER_ASK_FIRST=true           # Ask confirmation before triggering
YOLO_MODE_CONFIDENCE=0.95             # Auto-trigger above this (no confirmation)
CONFIRMATION_TIMEOUT=3000             # Auto-select default after N milliseconds
```

---

## Testing

**File:** `tests/tools/auto-orchestrate.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { autoOrchestrate } from '../../src/tools/auto-orchestrate';

describe('auto_orchestrate', () => {
  beforeEach(() => {
    // Set test environment variables
    process.env.AUTO_TRIGGER_CONFIDENCE = '0.8';
    process.env.YOLO_MODE_CONFIDENCE = '0.95';
    process.env.AUTO_TRIGGER_ASK_FIRST = 'true';
  });
  
  it('auto-triggers high-confidence workflow requests', async () => {
    const result = await autoOrchestrate({
      userMessage: 'Implement video format templates for debates'
    });
    
    expect(result.decision).toBe('trigger-workflow');
    expect(result.confidence).toBeGreaterThan(0.90);
    expect(result.workflowResult).toBeDefined();
  });
  
  it('asks confirmation for medium-confidence requests', async () => {
    const result = await autoOrchestrate({
      userMessage: 'Format templates' // More ambiguous
    });
    
    if (result.confidence >= 0.80 && result.confidence < 0.95) {
      expect(result.decision).toBe('ask-confirmation');
      expect(result.confirmationMessage).toContain('Should I trigger');
    }
  });
  
  it('answers directly for simple questions', async () => {
    const result = await autoOrchestrate({
      userMessage: 'What are format templates?'
    });
    
    expect(result.decision).toBe('answer-directly');
    expect(result.classification.type).toBe('simple-question');
  });
  
  it('respects YOLO mode threshold', async () => {
    process.env.YOLO_MODE_CONFIDENCE = '0.85';
    
    const result = await autoOrchestrate({
      userMessage: 'Implement authentication system'
    });
    
    if (result.confidence >= 0.85) {
      expect(result.decision).toBe('trigger-workflow');
    }
  });
});
```

---

## MCP Tool Registration

**Add to `src/index.ts`:**

```typescript
import { autoOrchestrate } from './tools/auto-orchestrate.js';

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... existing tools ...
    {
      name: 'auto_orchestrate',
      description: 'Intelligently decide whether to trigger workflow or answer directly',
      inputSchema: zodToJsonSchema(AutoOrchestrateInputSchema)
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'auto_orchestrate') {
    const input = AutoOrchestrateInputSchema.parse(request.params.arguments);
    const result = await autoOrchestrate(input);
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify(result, null, 2) 
      }] 
    };
  }
  // ... handle other tools ...
});
```

---

## Expected Outputs

1. **auto_orchestrate MCP tool** - Main decision maker
2. **Configuration system** - Environment-based thresholds
3. **Confirmation flow** - User-friendly messages
4. **Test suite** - Validates decision logic

---

## Success Criteria

- ✅ Auto-triggers workflows with confidence >95%
- ✅ Asks confirmation for 80-95% confidence
- ✅ Configuration overrides work correctly
- ✅ YOLO mode bypasses confirmation appropriately
- ✅ Confirmation messages are clear and helpful
- ✅ All tests pass

---

## Time Estimate

- Implementation: 3 hours
- Configuration system: 1 hour
- Testing and tuning: 1-2 hours

**Total: 4-6 hours**
