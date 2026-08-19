# Sprint 002: Template System & State Management

**Sprint Goal:** Implement template system for reusable coordination patterns and basic state management for workflow tracking

**Duration:** 3-4 days (6-8 hours)

**Priority:** HIGH (enables core orchestration features)

---

## Problem Statement

Agents need:
1. **Templates** - Reusable task specification patterns (code-review, debate-generation, etc.)
2. **State Management** - Track tasks, workflows, agent assignments, and progress

Without these, we can't:
- Generate consistent task specs
- Track multi-step workflows
- Persist orchestration state
- Provide workflow monitoring

---

## Tasks

### Task 1: Template Type System 📝
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Define TypeScript types and schemas for templates

**Steps:**
1. Create src/templates/types.ts
2. Define TaskTemplate interface
3. Define TemplateInput, ExecutionStep, OutputSpec types
4. Create Zod schemas for validation
5. Write tests for type validation

**Implementation:**
```typescript
// src/templates/types.ts
import { z } from "zod";

export const TemplateInputSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object", "file", "reference"]),
  required: z.boolean().default(false),
  default: z.any().optional(),
  description: z.string().optional(),
});

export const ExecutionStepSchema = z.string();

export const OutputSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string().optional(),
});

export const SuccessCriterionSchema = z.string();

export const TaskTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputs: z.array(TemplateInputSchema),
  executionSteps: z.array(ExecutionStepSchema),
  expectedOutputs: z.array(OutputSpecSchema),
  successCriteria: z.array(SuccessCriterionSchema),
  estimatedTokens: z.object({
    planning: z.number().optional(),
    execution: z.number().optional(),
    validation: z.number().optional(),
    reporting: z.number().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

export type TemplateInput = z.infer<typeof TemplateInputSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type OutputSpec = z.infer<typeof OutputSpecSchema>;
export type SuccessCriterion = z.infer<typeof SuccessCriterionSchema>;
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;
```

**Success Criteria:**
- Types compile without errors
- Schemas validate correctly
- Tests verify validation behavior

---

### Task 2: Template Loader & Registry 📚
**Estimated Complexity:** Medium  
**Time:** 2 hours

**Purpose:** Load templates from JSON files and provide registry for access

**Steps:**
1. Create src/templates/loader.ts
2. Implement loadTemplate(name) function
3. Implement loadAllTemplates() function
4. Create TemplateRegistry class
5. Add caching for loaded templates
6. Write tests

**Implementation:**
```typescript
// src/templates/loader.ts
import { readFile } from "fs/promises";
import { join } from "path";
import { TaskTemplate, TaskTemplateSchema } from "./types.js";

export class TemplateLoader {
  private cache = new Map<string, TaskTemplate>();
  private templatesDir: string;

  constructor(templatesDir: string = "templates") {
    this.templatesDir = templatesDir;
  }

  async load(name: string): Promise<TaskTemplate> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const filePath = join(this.templatesDir, `${name}.json`);
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);
    
    const template = TaskTemplateSchema.parse(json);
    this.cache.set(name, template);
    
    return template;
  }

  async loadAll(): Promise<Map<string, TaskTemplate>> {
    // Implementation: scan directory and load all templates
  }

  clearCache() {
    this.cache.clear();
  }
}
```

**Success Criteria:**
- Loads templates from JSON files
- Validates template schema
- Caches loaded templates
- Tests verify loading and caching

---

### Task 3: Built-in Templates 🎯
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Create commonly used templates extracted from reference repos

**Steps:**
1. Create templates/code-review.json
2. Create templates/typescript-feature.json
3. Create templates/typescript-test.json
4. Create templates/documentation.json
5. Create templates/debate-generation.json
6. Test all templates load correctly

**Example Template:**
```json
// templates/code-review.json
{
  "name": "code-review",
  "description": "Review code for quality, bugs, and best practices",
  "inputs": [
    {
      "name": "filePath",
      "type": "file",
      "required": true,
      "description": "Path to code file to review"
    },
    {
      "name": "criteria",
      "type": "array",
      "required": false,
      "default": ["quality", "bugs", "style"],
      "description": "Review criteria to evaluate"
    }
  ],
  "executionSteps": [
    "Read the code file",
    "Analyze code structure and patterns",
    "Identify issues and improvements",
    "Check against criteria",
    "Generate structured report"
  ],
  "expectedOutputs": [
    {
      "name": "review_report",
      "description": "Structured code review with findings and recommendations"
    }
  ],
  "successCriteria": [
    "All criteria evaluated",
    "Issues identified with severity",
    "Actionable recommendations provided"
  ],
  "estimatedTokens": {
    "planning": 100,
    "execution": 1000,
    "validation": 200,
    "reporting": 300
  }
}
```

**Success Criteria:**
- 5+ templates created
- All templates validate against schema
- Templates cover common use cases
- Documentation explains each template

---

### Task 4: State Management Types & Interfaces 🗄️
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Define state structures for tasks, workflows, and agents

**Steps:**
1. Create src/state/types.ts
2. Define Task, TaskSpec, TaskStatus types
3. Define Workflow, WorkflowState types
4. Define AgentInfo, TokenMetrics types
5. Create Zod schemas
6. Write tests

**Implementation:**
```typescript
// src/state/types.ts
import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "pending",
  "executing",
  "completed",
  "failed",
  "cancelled",
]);

export const TaskSpecSchema = z.object({
  id: z.string(),
  task: z.string(),
  executor: z.string(),
  template: z.string(),
  context: z.record(z.any()).optional(),
  inputs: z.record(z.any()),
  executionSteps: z.array(z.string()),
  expectedOutputs: z.array(z.any()),
  successCriteria: z.array(z.string()),
  metadata: z.object({
    created: z.string(),
    estimatedTokens: z.number().optional(),
  }),
});

export const TaskSchema = z.object({
  id: z.string(),
  spec: TaskSpecSchema,
  executor: z.string(),
  status: TaskStatusSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  report: z.any().optional(),
  tokenUsage: z.object({
    total: z.number(),
  }).optional(),
});

export const WorkflowStateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  tasks: z.array(TaskSchema),
  currentTask: z.string().nullable(),
  status: z.enum(["pending", "in-progress", "completed", "failed"]),
  tokenUsage: z.object({
    planning: z.number(),
    execution: z.number(),
    validation: z.number(),
    reporting: z.number(),
    total: z.number(),
  }),
  startTime: z.string(),
  endTime: z.string().optional(),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
```

**Success Criteria:**
- Types compile correctly
- Schemas validate properly
- Tests verify validation

---

### Task 5: In-Memory State Manager 💾
**Estimated Complexity:** High  
**Time:** 2-3 hours

**Purpose:** Implement state manager for tracking tasks and workflows

**Steps:**
1. Create src/state/state-manager.ts
2. Implement WorkflowManager class
3. Add methods: createTask, updateTask, getTask, createWorkflow, etc.
4. Add token tracking methods
5. Write comprehensive tests
6. Document API

**Implementation:**
```typescript
// src/state/state-manager.ts
import { Task, TaskSpec, WorkflowState } from "./types.js";
import { randomUUID } from "crypto";

export class StateManager {
  private tasks = new Map<string, Task>();
  private workflows = new Map<string, WorkflowState>();

  createTask(spec: TaskSpec): Task {
    const task: Task = {
      id: spec.id,
      spec,
      executor: spec.executor,
      status: "pending",
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  updateTaskStatus(id: string, status: TaskStatus) {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    task.status = status;
    if (status === "executing" && !task.startTime) {
      task.startTime = new Date().toISOString();
    }
    if ((status === "completed" || status === "failed") && !task.endTime) {
      task.endTime = new Date().toISOString();
    }
  }

  createWorkflow(name?: string): WorkflowState {
    const workflow: WorkflowState = {
      id: randomUUID(),
      name,
      tasks: [],
      currentTask: null,
      status: "pending",
      tokenUsage: { planning: 0, execution: 0, validation: 0, reporting: 0, total: 0 },
      startTime: new Date().toISOString(),
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflow(id: string): WorkflowState | null {
    return this.workflows.get(id) || null;
  }

  trackTokenUsage(workflowId: string, stage: string, tokens: number) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    
    if (stage in workflow.tokenUsage) {
      workflow.tokenUsage[stage as keyof typeof workflow.tokenUsage] += tokens;
    }
    workflow.tokenUsage.total += tokens;
  }
}
```

**Success Criteria:**
- All CRUD operations work
- Token tracking accurate
- Thread-safe (for Node.js environment)
- Tests cover all methods

---

### Task 6: Integration & Documentation 🔗
**Estimated Complexity:** Medium  
**Time:** 1 hour

**Purpose:** Integrate template system and state manager with MCP server

**Steps:**
1. Update src/index.ts to initialize templateLoader and stateManager
2. Make available to tool handlers
3. Update tests to use integrated system
4. Document template format and usage
5. Create examples in examples/

**Success Criteria:**
- Templates and state accessible from tools
- Documentation complete
- Examples demonstrate usage
- All tests pass

---

## Dependencies

```
Task 1 (Template Types)
  ↓
Task 2 (Template Loader) ← Task 3 (Built-in Templates)
  ↓
Task 4 (State Types)
  ↓
Task 5 (State Manager)
  ↓
Task 6 (Integration)
```

---

## Success Criteria (Sprint Completion)

- [x] Template system loads and validates templates
- [x] 5+ built-in templates available
- [x] State manager tracks tasks and workflows
- [x] Token usage tracked per workflow
- [x] Integration with MCP server complete
- [x] All tests pass (>80% coverage)
- [x] Documentation covers templates and state management

---

## Verification Commands

```bash
# Build
npm run build

# Run tests
npm test

# Verify templates load
node -e "
const { TemplateLoader } = require('./dist/templates/loader.js');
const loader = new TemplateLoader();
loader.load('code-review').then(t => console.log(t));
"
```

---

## Outputs

### Code Artifacts
- src/templates/types.ts
- src/templates/loader.ts
- src/state/types.ts
- src/state/state-manager.ts
- templates/*.json (5+ templates)
- tests/ (comprehensive test suite)

### Documentation
- docs/templates.md (template format and usage)
- docs/state-management.md
- examples/template-usage.ts

---

## Token Budget

**Estimated Token Usage:**
- Claude planning: 300 tokens
- Task specs: 200 tokens × 6 = 1200 tokens
- Gemini execution: (uses Gemini budget)
- Claude reviews: 200 tokens × 6 = 1200 tokens

**Total Claude Tokens:** ~2700 tokens

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template schema too rigid | High | Use flexible metadata field |
| State management complexity | Medium | Start with in-memory, add persistence later |
| Template validation slow | Low | Cache validated templates |

---

## Next Sprint Preview

**Sprint 003** will build core orchestration tools:
- create_task_spec tool (uses templates)
- delegate_task tool (uses state manager)
- collect_report tool
- Token tracking integration

---

**Status:** Completed (2026-02-12)  
**Assigned To:** Gemini (execution), Claude (review)  
**Created:** 2026-02-12  
**Updated:** 2026-02-12
