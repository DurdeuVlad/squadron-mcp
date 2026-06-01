# Sprint 003: Core Orchestration Tools

**Sprint Goal:** Implement the primary MCP tools for agent coordination (create_task_spec, delegate_task, collect_report)

**Duration:** 3-4 days (6-8 hours)

**Priority:** CRITICAL (core functionality)

---

## Problem Statement

This sprint implements the **heart of the orchestrator** - the tools that enable multi-agent coordination:

1. **create_task_spec** - Convert high-level requests into structured task specifications
2. **delegate_task** - Hand off tasks to executor agents with context management
3. **collect_report** - Gather execution results in structured format
4. **review_output** - Trigger review workflows with quality criteria

Without these tools, agents can't coordinate efficiently.

---

## Tasks

### Task 1: create_task_spec Tool 📋
**Estimated Complexity:** High  
**Time:** 2-3 hours

**Purpose:** Generate structured task specifications from high-level descriptions using templates

**Steps:**
1. Create src/tools/create-task-spec.ts
2. Define input schema (Zod)
3. Implement template loading logic
4. Implement context merging (template inputs + provided context)
5. Generate unique task ID
6. Save task spec to state manager
7. Write comprehensive tests
8. Document API

**Implementation:**
```typescript
// src/tools/create-task-spec.ts
import { z } from "zod";
import { randomUUID } from "crypto";
import { TemplateLoader } from "../templates/loader.js";
import { StateManager } from "../state/state-manager.js";
import { TaskSpec } from "../state/types.js";

const CreateTaskSpecInputSchema = z.object({
  task: z.string().describe("High-level task description"),
  executor: z.string().describe("Target executor agent (e.g., 'gemini')"),
  template: z.string().describe("Template name (e.g., 'code-review')"),
  context: z.record(z.any()).optional().describe("Additional context"),
});

export type CreateTaskSpecInput = z.infer<typeof CreateTaskSpecInputSchema>;

export async function createTaskSpec(
  input: CreateTaskSpecInput,
  templateLoader: TemplateLoader,
  stateManager: StateManager
): Promise<TaskSpec> {
  // Validate input
  const validated = CreateTaskSpecInputSchema.parse(input);

  // Load template
  const template = await templateLoader.load(validated.template);

  // Merge context with template defaults
  const inputs: Record<string, any> = {};
  for (const inputDef of template.inputs) {
    if (validated.context && inputDef.name in validated.context) {
      inputs[inputDef.name] = validated.context[inputDef.name];
    } else if (inputDef.default !== undefined) {
      inputs[inputDef.name] = inputDef.default;
    } else if (inputDef.required) {
      throw new Error(`Missing required input: ${inputDef.name}`);
    }
  }

  // Generate task spec
  const taskSpec: TaskSpec = {
    id: randomUUID(),
    task: validated.task,
    executor: validated.executor,
    template: validated.template,
    context: validated.context,
    inputs,
    executionSteps: template.executionSteps,
    expectedOutputs: template.expectedOutputs,
    successCriteria: template.successCriteria,
    metadata: {
      created: new Date().toISOString(),
      estimatedTokens: template.estimatedTokens?.total || 0,
    },
  };

  // Save to state
  stateManager.createTask(taskSpec);

  return taskSpec;
}
```

**Success Criteria:**
- Loads template correctly
- Merges context with template inputs
- Validates required inputs
- Generates unique task ID
- Saves to state manager
- Tests cover happy path + errors

---

### Task 2: delegate_task Tool 🤝
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Format and delegate tasks to executor agents

**Steps:**
1. Create src/tools/delegate-task.ts
2. Define input schema
3. Load task spec from state
4. Format task for executor (markdown)
5. Update task status to "executing"
6. Return formatted task ready for agent
7. Write tests

**Implementation:**
```typescript
// src/tools/delegate-task.ts
import { z } from "zod";
import { StateManager } from "../state/state-manager.js";

const DelegateTaskInputSchema = z.object({
  taskId: z.string().describe("Task ID from create_task_spec"),
  executor: z.string().describe("Executor agent name"),
});

export type DelegateTaskInput = z.infer<typeof DelegateTaskInputSchema>;

export function delegateTask(
  input: DelegateTaskInput,
  stateManager: StateManager
): string {
  const validated = DelegateTaskInputSchema.parse(input);

  // Load task
  const task = stateManager.getTask(validated.taskId);
  if (!task) {
    throw new Error(`Task not found: ${validated.taskId}`);
  }

  // Verify executor matches
  if (task.spec.executor !== validated.executor) {
    throw new Error(
      `Task executor mismatch. Expected: ${task.spec.executor}, Got: ${validated.executor}`
    );
  }

  // Update status
  stateManager.updateTaskStatus(validated.taskId, "executing");

  // Format task for executor
  const formatted = formatTaskForExecutor(task.spec);

  return formatted;
}

function formatTaskForExecutor(spec: TaskSpec): string {
  return `
**Task:** ${spec.task}

**Task ID:** ${spec.id}

**Context:** ${spec.context ? JSON.stringify(spec.context, null, 2) : "None"}

**Inputs:**
${Object.entries(spec.inputs)
  .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
  .join("\n")}

**Execution Steps:**
${spec.executionSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Expected Outputs:**
${spec.expectedOutputs.map((output) => `- ${output.name}: ${output.description}`).join("\n")}

**Success Criteria:**
${spec.successCriteria.map((criteria) => `- ${criteria}`).join("\n")}

---

**Instructions for Executor:**
1. Follow execution steps in order
2. Validate against success criteria
3. Generate structured report when complete
4. Report back using collect_report tool
`.trim();
}
```

**Success Criteria:**
- Loads task from state
- Validates executor matches
- Updates task status
- Formats task clearly
- Tests cover all scenarios

---

### Task 3: collect_report Tool 📊
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Collect execution reports from executor agents

**Steps:**
1. Create src/tools/collect-report.ts
2. Define input schema (report structure)
3. Implement report validation
4. Update task status and save report
5. Calculate token usage if provided
6. Return formatted report for planner
7. Write tests

**Implementation:**
```typescript
// src/tools/collect-report.ts
import { z } from "zod";
import { StateManager } from "../state/state-manager.js";

const ExecutionReportSchema = z.object({
  taskId: z.string(),
  status: z.enum(["success", "failed"]),
  outputs: z.record(z.any()),
  metrics: z.object({
    testsPassed: z.number().optional(),
    testsTotal: z.number().optional(),
    buildSuccess: z.boolean().optional(),
    tokensUsed: z.number().optional(),
  }).optional(),
  issues: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  excerpts: z.record(z.string()).optional(),
  duration: z.string().optional(),
});

export type ExecutionReport = z.infer<typeof ExecutionReportSchema>;

const CollectReportInputSchema = z.object({
  taskId: z.string(),
  report: ExecutionReportSchema,
});

export type CollectReportInput = z.infer<typeof CollectReportInputSchema>;

export function collectReport(
  input: CollectReportInput,
  stateManager: StateManager
): string {
  const validated = CollectReportInputSchema.parse(input);

  // Load task
  const task = stateManager.getTask(validated.taskId);
  if (!task) {
    throw new Error(`Task not found: ${validated.taskId}`);
  }

  // Update task with report
  task.report = validated.report;
  task.status = validated.report.status === "success" ? "completed" : "failed";
  task.endTime = new Date().toISOString();

  // Track token usage if provided
  if (validated.report.metrics?.tokensUsed) {
    task.tokenUsage = { total: validated.report.metrics.tokensUsed };
  }

  // Format report for planner
  const formatted = formatReportForPlanner(validated.report, task.spec.task);

  return formatted;
}

function formatReportForPlanner(report: ExecutionReport, taskName: string): string {
  const statusEmoji = report.status === "success" ? "✅" : "❌";

  return `
**Task Completed:** ${taskName}

**Status:** ${statusEmoji} ${report.status.toUpperCase()}

**Outputs:**
${Object.entries(report.outputs || {})
  .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
  .join("\n")}

${report.metrics ? `
**Metrics:**
${report.metrics.testsPassed !== undefined ? `- Tests: ${report.metrics.testsPassed}/${report.metrics.testsTotal} passing` : ""}
${report.metrics.buildSuccess !== undefined ? `- Build: ${report.metrics.buildSuccess ? "✅ Success" : "❌ Failed"}` : ""}
${report.metrics.tokensUsed ? `- Tokens Used: ${report.metrics.tokensUsed}` : ""}
`.trim() : ""}

${report.issues && report.issues.length > 0 ? `
**Issues:**
${report.issues.map((issue) => `⚠️ ${issue}`).join("\n")}
` : ""}

${report.recommendations && report.recommendations.length > 0 ? `
**Recommendations:**
${report.recommendations.map((rec) => `💡 ${rec}`).join("\n")}
` : ""}

${report.excerpts ? `
**Code Excerpts:**
${Object.entries(report.excerpts)
  .map(([name, code]) => `\n**${name}:**\n\`\`\`\n${code}\n\`\`\``)
  .join("\n")}
` : ""}

${report.duration ? `**Duration:** ${report.duration}` : ""}
`.trim();
}
```

**Success Criteria:**
- Validates report structure
- Updates task status correctly
- Tracks token usage
- Formats report clearly
- Tests cover all scenarios

---

### Task 4: review_output Tool ✅
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Enable planner to review executor output and provide feedback

**Steps:**
1. Create src/tools/review-output.ts
2. Define input schema (criteria, decision)
3. Load task and report
4. Record review decision
5. Support approve/revise/reject workflows
6. Write tests

**Implementation:**
```typescript
// src/tools/review-output.ts
import { z } from "zod";
import { StateManager } from "../state/state-manager.js";

const ReviewOutputInputSchema = z.object({
  taskId: z.string(),
  criteria: z.array(z.string()).describe("Review criteria to evaluate"),
  decision: z.enum(["approve", "revise", "reject"]),
  feedback: z.string().optional().describe("Feedback for revisions"),
  reviewer: z.string().describe("Reviewer agent name (e.g., 'claude')"),
});

export type ReviewOutputInput = z.infer<typeof ReviewOutputInputSchema>;

export function reviewOutput(
  input: ReviewOutputInput,
  stateManager: StateManager
): string {
  const validated = ReviewOutputInputSchema.parse(input);

  // Load task
  const task = stateManager.getTask(validated.taskId);
  if (!task) {
    throw new Error(`Task not found: ${validated.taskId}`);
  }

  if (!task.report) {
    throw new Error(`No report found for task: ${validated.taskId}`);
  }

  // Record review
  task.metadata = task.metadata || {};
  task.metadata.review = {
    reviewer: validated.reviewer,
    criteria: validated.criteria,
    decision: validated.decision,
    feedback: validated.feedback,
    timestamp: new Date().toISOString(),
  };

  // Update status based on decision
  if (validated.decision === "approve") {
    // Task remains completed
  } else if (validated.decision === "revise") {
    task.status = "pending"; // Ready for revision
  } else if (validated.decision === "reject") {
    task.status = "failed";
  }

  // Format response
  const response = formatReviewResponse(validated.decision, validated.feedback);

  return response;
}

function formatReviewResponse(decision: string, feedback?: string): string {
  if (decision === "approve") {
    return "✅ **Review Approved** - Task meets all criteria and is ready to proceed.";
  } else if (decision === "revise") {
    return `🔄 **Revision Requested**\n\n${feedback || "Please address the issues and resubmit."}`;
  } else {
    return `❌ **Review Rejected**\n\n${feedback || "Task does not meet requirements."}`;
  }
}
```

**Success Criteria:**
- Validates review input
- Records review decision
- Updates task status appropriately
- Provides clear feedback format
- Tests cover all decisions

---

### Task 5: track_workflow Tool 📊
**Estimated Complexity:** Easy  
**Time:** 1 hour

**Purpose:** Provide workflow progress and status monitoring

**Steps:**
1. Create src/tools/track-workflow.ts
2. Define input schema
3. Load workflow state
4. Format progress summary
5. Include token usage metrics
6. Write tests

**Implementation:**
```typescript
// src/tools/track-workflow.ts
import { z } from "zod";
import { StateManager } from "../state/state-manager.js";

const TrackWorkflowInputSchema = z.object({
  workflowId: z.string(),
});

export type TrackWorkflowInput = z.infer<typeof TrackWorkflowInputSchema>;

export function trackWorkflow(
  input: TrackWorkflowInput,
  stateManager: StateManager
): string {
  const validated = TrackWorkflowInputSchema.parse(input);

  const workflow = stateManager.getWorkflow(validated.workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${validated.workflowId}`);
  }

  // Calculate progress
  const completed = workflow.tasks.filter((t) => t.status === "completed").length;
  const failed = workflow.tasks.filter((t) => t.status === "failed").length;
  const inProgress = workflow.tasks.filter((t) => t.status === "executing").length;
  const pending = workflow.tasks.filter((t) => t.status === "pending").length;

  return `
**Workflow Status:** ${workflow.status.toUpperCase()}

**Progress:**
- ✅ Completed: ${completed}/${workflow.tasks.length}
- ⚙️ In Progress: ${inProgress}
- ⏳ Pending: ${pending}
- ❌ Failed: ${failed}

**Token Usage:**
- Planning: ${workflow.tokenUsage.planning}
- Execution: ${workflow.tokenUsage.execution}
- Validation: ${workflow.tokenUsage.validation}
- Reporting: ${workflow.tokenUsage.reporting}
- **Total: ${workflow.tokenUsage.total}**

**Tasks:**
${workflow.tasks
  .map((task) => {
    const emoji = {
      completed: "✅",
      failed: "❌",
      executing: "⚙️",
      pending: "⏳",
      cancelled: "🚫",
    }[task.status];
    return `${emoji} ${task.spec.task} (${task.status})`;
  })
  .join("\n")}

**Started:** ${workflow.startTime}
${workflow.endTime ? `**Ended:** ${workflow.endTime}` : ""}
`.trim();
}
```

**Success Criteria:**
- Loads workflow correctly
- Calculates progress accurately
- Displays token usage
- Tests verify all scenarios

---

### Task 6: Register Tools in MCP Server 🔌
**Estimated Complexity:** Medium  
**Time:** 1 hour

**Purpose:** Integrate all tools with MCP server

**Steps:**
1. Update src/index.ts
2. Register all 5 tools
3. Wire up dependencies (templateLoader, stateManager)
4. Test all tools via MCP inspector
5. Update documentation

**Success Criteria:**
- All tools registered and listed
- Tools can be invoked successfully
- End-to-end workflow works
- Documentation updated

---

## Dependencies

```
Task 1 (create_task_spec)
  ↓
Task 2 (delegate_task)
  ↓
Task 3 (collect_report) ← Task 4 (review_output)
  ↓                        ↓
Task 5 (track_workflow)
  ↓
Task 6 (Register Tools)
```

---

## Success Criteria (Sprint Completion)

- [x] All 5 tools implemented and tested
- [x] End-to-end workflow: create → delegate → collect → review → track
- [x] All tests pass (>80% coverage)
- [x] Tools registered in MCP server
- [x] Documentation complete with examples
- [x] Example workflows added to examples/

---

## Verification Commands

```bash
# Build and test
npm run build
npm test

# Test orchestration workflow
node examples/test-orchestration.js
```

---

## Outputs

### Code Artifacts
- src/tools/create-task-spec.ts
- src/tools/delegate-task.ts
- src/tools/collect-report.ts
- src/tools/review-output.ts
- src/tools/track-workflow.ts
- tests/tools/*.test.ts

### Documentation
- docs/tools.md (API reference for all tools)
- examples/orchestration-workflow.ts

---

## Token Budget

**Estimated Token Usage:**
- Claude planning: 400 tokens
- Task specs: 250 tokens × 6 = 1500 tokens
- Gemini execution: (uses Gemini budget)
- Claude reviews: 250 tokens × 6 = 1500 tokens

**Total Claude Tokens:** ~3400 tokens

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tool API complexity | High | Keep interfaces simple, document thoroughly |
| Error handling edge cases | Medium | Comprehensive testing + validation |
| State consistency | High | Atomic updates, transaction-like semantics |

---

## Next Sprint Preview

**Sprint 004** will add:
- Role boundary enforcement
- Configuration system
- Quality gates
- Token optimization analytics

---

**Status:** Completed (2026-02-12)  
**Assigned To:** Gemini (execution), Claude (review)  
**Created:** 2026-02-12  
**Updated:** 2026-02-12
