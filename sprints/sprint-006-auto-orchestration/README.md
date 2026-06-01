# Sprint 006: Intelligent Auto-Orchestration

**Status:** Completed (2026-02-12)  
**Duration:** 5-6 days  
**Dependencies:** Sprint 001-005 (Core MCP server, templates, orchestration tools)

---

## Problem Statement

Currently, users must explicitly decide when to trigger workflows:
- Pattern 1 (Manual): User coordinates each step via Copilot using MCP tools
- Pattern 2 (Workflow): User explicitly says "run workflow for X"

**Goal:** Make the AI smart enough to automatically detect when to trigger full workflows (Pattern 2) vs. answering directly, based on intent classification.

---

## Success Criteria

- ✅ AI automatically detects workflow-suitable requests (>80% accuracy)
- ✅ Auto-triggers workflows for clear implementation/audit requests
- ✅ Asks for confirmation when uncertain (60-95% confidence)
- ✅ Answers simple questions directly without unnecessary orchestration
- ✅ Extracts workflow parameters from natural language
- ✅ Integrates seamlessly with GitHub Copilot

---

## Sprint Breakdown (5 Sub-Sprints)

### Sprint 006-A: Intent Classification System (1-2 days)

**Goal:** Build intelligence to classify user requests

**Tasks:**

1. **Create `classify_intent` MCP Tool**
   - Input: User message string
   - Output: Classification (simple-question | complex-task | workflow-candidate)
   - Confidence score (0-1)
   - Recommended action

2. **Define Classification Rules**
   ```typescript
   const WORKFLOW_TRIGGERS = [
     /implement|build|create|add feature/i,
     /audit|analyze|review.*from.*perspective/i,
     /sprint|multiple tasks|series of/i,
     /improve|refactor|optimize|fix all/i,
     /workflow|standard process|my usual flow/i
   ];
   
   const SIMPLE_QUESTIONS = [
     /what is|how does|explain|tell me about/i,
     /why|when should|which one/i,
     /show me|give me an example/i
   ];
   ```

3. **Implement Confidence Scoring**
   - Pattern matching weight: 40%
   - Context signals weight: 30%
   - Message complexity weight: 30%

4. **Create Test Suite**
   - Test 50+ example user messages
   - Validate accuracy >80%
   - Tune thresholds

**Outputs:**
- `src/tools/classify-intent.ts`
- `tests/tools/classify-intent.test.ts`
- `src/config/classification-rules.json`

**Success Criteria:**
- Classifies workflow requests with >80% accuracy
- Classifies simple questions with >95% accuracy
- Tests pass with comprehensive coverage

---

### Sprint 006-B: Workflow Parameter Extraction (1 day)

**Goal:** Extract structured parameters from natural language

**Tasks:**

1. **Create `extract_workflow_params` Function**
   ```typescript
   extractWorkflowParams("Implement format templates from performance perspective")
   // Returns:
   // {
   //   goal: "implement format templates",
   //   perspective: "performance",
   //   isAudit: false,
   //   taskCount: 6
   // }
   ```

2. **Implement Extractors**
   - Extract goal: Main objective from sentence
   - Extract perspective: "from X perspective" → X
   - Extract task count: "6 tasks" → 6 (default: 6)
   - Detect audit mode: Presence of "audit/review/analyze"

3. **Handle Edge Cases**
   - Ambiguous goals → Ask for clarification
   - Missing parameters → Use smart defaults
   - Multiple goals → Detect and ask which one

4. **Create Test Suite**
   - Test 30+ variations of parameter formats
   - Validate extraction accuracy

**Outputs:**
- `src/tools/extract-workflow-params.ts`
- `tests/tools/extract-workflow-params.test.ts`

**Success Criteria:**
- Extracts goal with >90% accuracy
- Extracts parameters correctly
- Handles edge cases gracefully

---

### Sprint 006-C: Auto-Trigger Logic & Confirmation Flow (1 day)

**Goal:** Implement intelligent auto-triggering with user confirmation when needed

**Tasks:**

1. **Create `auto_orchestrate` MCP Tool**
   - Combines intent classification + parameter extraction
   - Decides: trigger workflow | use individual tool | answer directly
   - Handles confirmation flow

2. **Implement Confidence Thresholds**
   ```typescript
   if (confidence >= 0.95) {
     // Auto-trigger (YOLO mode)
     return await executeWorkflow(params);
   } else if (confidence >= 0.80) {
     // Ask for confirmation
     return {
       requiresConfirmation: true,
       message: `Trigger workflow for "${params.goal}"?`,
       params
     };
   } else {
     // Too uncertain - suggest alternatives
     return { suggestedAction: 'ask-clarification' };
   }
   ```

3. **Build Confirmation Flow**
   - Generate confirmation message
   - Include detected parameters
   - Offer alternatives (A/B/C options)
   - Auto-select after timeout (3s default)

4. **Add Configuration**
   ```bash
   # .env
   AUTO_TRIGGER_WORKFLOWS=true      # Enable auto-triggering
   AUTO_TRIGGER_CONFIDENCE=0.8      # Minimum confidence
   AUTO_TRIGGER_ASK_FIRST=true      # Confirm before trigger
   YOLO_MODE_CONFIDENCE=0.95        # Skip confirmation threshold
   CONFIRMATION_TIMEOUT=3000        # Auto-select timeout (ms)
   ```

**Outputs:**
- `src/tools/auto-orchestrate.ts`
- `src/config/auto-trigger-config.ts`
- `tests/tools/auto-orchestrate.test.ts`

**Success Criteria:**
- Auto-triggers high-confidence requests (>95%)
- Asks confirmation for medium confidence (80-95%)
- Rejects low confidence (<80%) with clarification request
- Configuration overrides work correctly

---

### Sprint 006-D: Context-Aware Intelligence (1 day)

**Goal:** Make decisions smarter based on file/folder context

**Tasks:**

1. **Implement Context Detection**
   ```typescript
   // If user is in sprints/sprint-014-format-templates/:
   const context = detectContext();
   // {
   //   inSprint: true,
   //   sprintNumber: 14,
   //   sprintGoal: "format-templates",
   //   suggestedAction: "continue-sprint"
   // }
   ```

2. **Build Smart Template Selection**
   - In sprint folder → Suggest "continue-sprint" template
   - In tests/ folder → Suggest "write-tests" template
   - In docs/ folder → Suggest "update-docs" template
   - Default → Use "user-standard-workflow"

3. **Implement Default Parameter Inference**
   ```typescript
   // User says: "Implement this"
   // In sprints/sprint-014-format-templates/
   // Infer: { goal: "continue sprint 014 - format templates" }
   ```

4. **Add Context-Aware Classification Rules**
   - Boost confidence if context matches request
   - Lower confidence if context conflicts
   - Suggest related workflows based on context

**Outputs:**
- `src/tools/detect-context.ts`
- `src/config/context-rules.json`
- `tests/tools/detect-context.test.ts`

**Success Criteria:**
- Detects file/folder context correctly
- Adjusts template suggestions based on context
- Infers parameters from context when appropriate
- Improves classification accuracy by 10-15%

---

### Sprint 006-E: Integration, Polish & User Experience (1 day)

**Goal:** Make auto-orchestration seamless and user-friendly

**Tasks:**

1. **GitHub Copilot Integration Pattern**
   - Document how Copilot should call `auto_orchestrate`
   - Create example prompts for Copilot
   - Test integration flow

2. **Progress Reporting**
   ```typescript
   // Real-time progress updates
   "🚀 Triggering standard workflow...
    Goal: implement format templates
    Tasks: 6
    
    Step 1/11: Defining requirements... ✅
    Step 2/11: Validating completeness... ✅
    Step 3/11: Internal debate... ⏳"
   ```

3. **User Experience Polish**
   - Clear confirmation messages
   - Helpful error messages
   - Progress indicators
   - Success/failure summaries

4. **Documentation**
   - Usage guide for auto-orchestration
   - Configuration reference
   - Examples for common scenarios
   - Troubleshooting guide

5. **End-to-End Testing**
   - Test 20+ real-world scenarios
   - Validate user experience flow
   - Ensure seamless integration

**Outputs:**
- `docs/AUTO_ORCHESTRATION.md`
- `examples/auto-orchestration-examples.md`
- `tests/integration/auto-orchestration.test.ts`

**Success Criteria:**
- Copilot integration works smoothly
- Progress reporting is clear and helpful
- Documentation is comprehensive
- User experience feels natural and effortless

---

## Configuration System

### `.env` Variables

```bash
# Auto-Orchestration Settings
AUTO_TRIGGER_WORKFLOWS=true           # Enable intelligent auto-triggering
AUTO_TRIGGER_CONFIDENCE=0.8           # Minimum confidence to consider auto-trigger
AUTO_TRIGGER_ASK_FIRST=true           # Ask confirmation (false = full YOLO)
YOLO_MODE_CONFIDENCE=0.95             # Skip confirmation above this threshold
CONFIRMATION_TIMEOUT=3000             # Auto-select default after Nms
CONTEXT_DETECTION_ENABLED=true        # Use file/folder context for decisions
```

### `src/config/auto-trigger-rules.json`

```json
{
  "workflowTriggers": [
    {
      "pattern": "implement|build|create.*feature",
      "template": "user-standard-workflow",
      "confidence": 0.9
    },
    {
      "pattern": "audit.*from.*perspective",
      "template": "audit-workflow",
      "confidence": 0.95
    },
    {
      "pattern": "run.*standard.*workflow",
      "template": "user-standard-workflow",
      "confidence": 1.0
    }
  ],
  "simpleQuestions": [
    "what is",
    "how does",
    "explain",
    "why",
    "when should",
    "show me",
    "give me an example"
  ],
  "contextRules": {
    "sprints/": {
      "suggestedTemplate": "continue-sprint",
      "confidenceBoost": 0.1
    },
    "tests/": {
      "suggestedTemplate": "write-tests",
      "confidenceBoost": 0.1
    }
  }
}
```

---

## User Experience Examples

### Example 1: Clear Workflow Request (Auto-Trigger)

```
User: "Implement format templates for debates"

AI (thinking):
  - Intent: workflow-candidate (confidence: 0.96)
  - Goal: "implement format templates for debates"
  - Task count: 6 (default)
  - Decision: Auto-trigger (>0.95)

AI: "🚀 Launching standard workflow...
     
     Goal: Implement format templates for debates
     Tasks: 6
     Estimated time: 2-3 hours
     
     Step 1/11: Defining requirements... ✅
     Step 2/11: Validating completeness... ✅
     Step 3/11: Running internal debate... ✅
     Step 4/11: Auto-approved (YOLO mode) ✅
     Step 5/11: Creating sprint plan... ⏳
     
     [Continues automatically...]"
```

### Example 2: Medium Confidence (Ask Confirmation)

```
User: "Format templates"

AI (thinking):
  - Intent: workflow-candidate (confidence: 0.82)
  - Goal: ambiguous (could be implement, audit, or docs)
  - Decision: Ask for confirmation

AI: "I detected this as a workflow task. Should I:
     
     A) Implement new format templates (full workflow) ← [Selected in 3s]
     B) Audit existing format templates
     C) Show documentation about format templates
     
     [3... 2... 1... Running option A]"
```

### Example 3: Simple Question (Answer Directly)

```
User: "What are format templates?"

AI (thinking):
  - Intent: simple-question (confidence: 0.98)
  - Decision: Answer directly (no MCP tools needed)

AI: "Format templates are reusable video layout definitions that specify..."
```

### Example 4: Context-Aware Detection

```
User: "Continue this" (in sprints/sprint-014-format-templates/)

AI (thinking):
  - Context: In sprint-014-format-templates folder
  - Intent: workflow-candidate (confidence: 0.88, +0.1 context boost = 0.98)
  - Goal: "continue sprint 014 - format templates" (inferred from context)
  - Decision: Auto-trigger

AI: "🚀 Continuing Sprint 014: Format Templates...
     
     Detected context: You're in sprint-014-format-templates/
     Goal: Continue implementing format templates
     
     [Auto-triggering workflow...]"
```

---

## Token Savings Analysis

### Current State (Manual Coordination)

```
User → Copilot: "I want to implement format templates" (50 tokens)
User → Copilot: "Create a sprint plan" (20 tokens)
Copilot → User: [Shows plan] (200 tokens)
User → Copilot: "Looks good, execute task 1" (30 tokens)
... repeat for each task ...

Total: ~1000+ tokens per workflow
```

### With Auto-Orchestration

```
User → Copilot: "Implement format templates" (20 tokens)
Copilot calls: auto_orchestrate() (50 tokens)
MCP internally runs entire workflow (0 tokens from user)
Copilot → User: [Progress + result] (100 tokens)

Total: ~170 tokens per workflow
```

**Savings: 83% token reduction** (1000 → 170 tokens)

---

## Dependencies

**Required from previous sprints:**
- ✅ Sprint 001: Core MCP server with tool registration
- ✅ Sprint 002: Template system with workflow templates
- ✅ Sprint 003: Core orchestration tools (execute_workflow, delegate_task)
- ✅ Sprint 004: Configuration system
- ✅ Sprint 005: CLI and testing infrastructure

**External dependencies:**
- None (self-contained)

---

## Testing Strategy

### Unit Tests
- Intent classification accuracy (>80%)
- Parameter extraction correctness (>90%)
- Confidence scoring logic
- Context detection

### Integration Tests
- Full auto-orchestration flow
- Confirmation flow handling
- Copilot integration
- Error handling and fallbacks

### User Acceptance Tests
- 20+ real-world scenarios
- Natural language variations
- Edge cases and ambiguity handling
- Performance and responsiveness

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Classification accuracy too low | Medium | High | Extensive testing, tunable thresholds |
| False positives (trigger when shouldn't) | Medium | Medium | Confidence thresholds, confirmation flow |
| User confusion about auto-behavior | Low | Medium | Clear messaging, configuration options |
| Performance overhead | Low | Low | Lightweight classification, async execution |

---

## Success Metrics

**Quantitative:**
- Intent classification accuracy: >80%
- Parameter extraction accuracy: >90%
- False positive rate: <5%
- Token reduction: >80%
- User workflow completion time: -50%

**Qualitative:**
- User reports: "It just works"
- Reduced coordination overhead
- Natural conversational experience
- Seamless Copilot integration

---

## Timeline

```
Day 1-2: Sprint 006-A (Intent Classification)
Day 3:   Sprint 006-B (Parameter Extraction)
Day 4:   Sprint 006-C (Auto-Trigger Logic)
Day 5:   Sprint 006-D (Context Intelligence)
Day 6:   Sprint 006-E (Integration & Polish)

Total: 5-6 days
```

---

## Next Steps After Completion

1. Monitor real-world usage and collect feedback
2. Tune classification rules based on actual user messages
3. Add more workflow templates as patterns emerge
4. Expand context detection to more scenarios
5. Consider ML-based classification for even better accuracy

---

## Notes

- Start with high confidence thresholds (0.95 for auto-trigger) and lower gradually based on accuracy
- Confirmation flow is critical for user trust - don't skip it initially
- Context detection will dramatically improve accuracy for repeat workflows
- Progress reporting keeps users informed during long-running workflows
- The goal is to make coordination feel completely natural and effortless
