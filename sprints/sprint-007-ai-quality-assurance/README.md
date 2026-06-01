# Sprint 007: Automatic AI Quality Assurance

**Status:** Completed (2026-02-12)  
**Duration:** 3-4 days  
**Dependencies:** Sprint 001-006 (full system operational)

---

## Problem Statement

Currently, quality assurance happens only at the end (step 11) with a simple auto-approve gate. This means:
- Issues discovered late (after all work done)
- No intermediate validation during multi-step workflows
- Generic QA prompts don't match context (code vs docs vs configs)
- Wasted tokens regenerating work that could have been caught early

**Goal:** Inject intelligent, context-aware QA prompts automatically throughout workflows based on what the AI is working on.

---

## Success Criteria

- ✅ AI automatically detects file type and injects appropriate QA prompts
- ✅ Quality checks run after each significant task (not just at end)
- ✅ Perspective-based validation (security audit → security QA prompts)
- ✅ Self-review system (agent reviews own output before reporting)
- ✅ Quality scores tracked across workflows
- ✅ Early detection reduces rework by 50%+

---

## Sprint Breakdown (4 Sub-Sprints)

### Sprint 007-A: QA Prompt Library (1 day)

**Goal:** Build comprehensive library of context-specific QA prompts

**Tasks:**

1. **Create QA Prompt Categories**

**File:** `src/config/qa-prompts.json`

```json
{
  "code": {
    "python": {
      "prompts": [
        "Does the code follow PEP 8 style guidelines?",
        "Are there appropriate type hints for function parameters and return values?",
        "Is error handling comprehensive with try-except blocks?",
        "Are there docstrings for all functions/classes?",
        "Is the code testable (no hard-coded values, injectable dependencies)?",
        "Are there any security vulnerabilities (SQL injection, XSS, etc.)?"
      ],
      "automatedChecks": [
        "ruff check {file}",
        "mypy {file}",
        "pytest tests/{test_file} -v"
      ]
    },
    "typescript": {
      "prompts": [
        "Does the code follow TypeScript best practices?",
        "Are all types explicitly defined (no 'any' types)?",
        "Is error handling implemented with proper error types?",
        "Are React components properly typed with Props interfaces?",
        "Is the code free of console.log statements?",
        "Are async functions properly handled with error boundaries?"
      ],
      "automatedChecks": [
        "npm run lint -- {file}",
        "npm run type-check",
        "npm run test -- {test_file}"
      ]
    },
    "javascript": {
      "prompts": [
        "Does the code use modern ES6+ syntax?",
        "Are promises handled correctly with .catch() or try-catch?",
        "Is the code free of var declarations (use let/const)?",
        "Are functions pure where possible (no side effects)?",
        "Is the code DRY (no repeated logic)?"
      ]
    }
  },
  "documentation": {
    "readme": {
      "prompts": [
        "Does the README include installation instructions?",
        "Are there usage examples with code snippets?",
        "Is the purpose/goal clearly stated in the first paragraph?",
        "Are dependencies and requirements listed?",
        "Is there a troubleshooting or FAQ section?",
        "Are links working and not broken?"
      ]
    },
    "api-docs": {
      "prompts": [
        "Are all endpoints documented with HTTP methods?",
        "Are request/response schemas provided?",
        "Are authentication requirements clearly stated?",
        "Are error codes and messages documented?",
        "Are there example requests and responses?",
        "Is rate limiting information included?"
      ]
    },
    "technical-guide": {
      "prompts": [
        "Is the target audience clearly identified?",
        "Are technical terms explained or linked to definitions?",
        "Are there diagrams or visuals where helpful?",
        "Is the structure logical with clear sections?",
        "Are code examples complete and runnable?",
        "Is there a 'Next Steps' or 'Related Reading' section?"
      ]
    }
  },
  "configuration": {
    "json": {
      "prompts": [
        "Is the JSON valid and properly formatted?",
        "Are all required fields present?",
        "Do values match expected types (number, string, boolean)?",
        "Are there comments where needed (if JSON5)?",
        "Is the structure consistent with schema/spec?",
        "Are sensitive values (keys, passwords) excluded?"
      ],
      "automatedChecks": [
        "jsonlint {file}",
        "ajv validate -s schema.json -d {file}"
      ]
    },
    "yaml": {
      "prompts": [
        "Is the YAML valid with correct indentation?",
        "Are all required keys present?",
        "Are environment-specific values parameterized?",
        "Is the file well-commented for future maintainers?",
        "Are secrets excluded (use env vars or secrets manager)?"
      ]
    },
    "env": {
      "prompts": [
        "Are all keys documented with comments?",
        "Are example values provided for each key?",
        "Are secrets clearly marked as sensitive?",
        "Is there an .env.example for reference?",
        "Are default values reasonable for development?"
      ]
    }
  },
  "tests": {
    "unit": {
      "prompts": [
        "Do tests cover happy path, edge cases, and error conditions?",
        "Are test names descriptive (describe what is being tested)?",
        "Are assertions specific and meaningful?",
        "Are tests independent (no shared state between tests)?",
        "Is mocking used appropriately (don't over-mock)?",
        "Is test coverage >80% for the module?"
      ]
    },
    "integration": {
      "prompts": [
        "Do tests verify actual integration between components?",
        "Are external dependencies properly mocked or stubbed?",
        "Are tests idempotent (can run multiple times safely)?",
        "Is cleanup performed after tests (database, files, etc.)?",
        "Are response times validated (performance)?",
        "Do tests cover failure scenarios (API down, timeout, etc.)?"
      ]
    }
  },
  "database": {
    "migration": {
      "prompts": [
        "Is the migration reversible (down migration provided)?",
        "Are column types appropriate for data?",
        "Are indexes added for frequently queried columns?",
        "Are foreign key constraints properly defined?",
        "Is there a migration description/comment?",
        "Does the migration preserve existing data?"
      ]
    },
    "schema": {
      "prompts": [
        "Are table names plural and consistent?",
        "Are primary keys defined for all tables?",
        "Are timestamps (created_at, updated_at) included?",
        "Are NOT NULL constraints used appropriately?",
        "Is normalization appropriate for use case?",
        "Are indexes optimized for query patterns?"
      ]
    }
  },
  "security": {
    "general": {
      "prompts": [
        "Are all inputs validated and sanitized?",
        "Is authentication/authorization required where needed?",
        "Are secrets stored securely (not hard-coded)?",
        "Is HTTPS used for all external communications?",
        "Are rate limits implemented to prevent abuse?",
        "Is logging sufficient but not exposing sensitive data?"
      ]
    },
    "api": {
      "prompts": [
        "Are API keys validated on every request?",
        "Is there protection against SQL injection?",
        "Is there protection against XSS attacks?",
        "Are CORS policies correctly configured?",
        "Is request size limited to prevent DoS?",
        "Are error messages safe (no stack traces in production)?"
      ]
    }
  },
  "performance": {
    "general": {
      "prompts": [
        "Are database queries optimized (no N+1 queries)?",
        "Is caching implemented where appropriate?",
        "Are large datasets paginated?",
        "Are expensive operations done asynchronously?",
        "Is lazy loading used for resources?",
        "Are there performance benchmarks or profiling?"
      ]
    },
    "frontend": {
      "prompts": [
        "Are images optimized and appropriately sized?",
        "Is code splitting used for large bundles?",
        "Are CSS and JS minified for production?",
        "Is lazy loading used for below-fold content?",
        "Are there unnecessary re-renders in React?",
        "Is browser caching configured correctly?"
      ]
    }
  }
}
```

2. **Create Perspective-Based QA Overlays**

**File:** `src/config/qa-perspectives.json`

```json
{
  "security": {
    "additionalPrompts": [
      "Have you considered all OWASP Top 10 vulnerabilities?",
      "Is authentication multi-factor where appropriate?",
      "Are all dependencies scanned for known vulnerabilities?",
      "Is sensitive data encrypted at rest and in transit?",
      "Are audit logs maintained for security events?"
    ],
    "severity": "critical"
  },
  "performance": {
    "additionalPrompts": [
      "What is the Big O complexity of this algorithm?",
      "Are there opportunities to reduce database round trips?",
      "Can parallel processing improve throughput?",
      "Are memory leaks possible with this implementation?",
      "What is the expected load and does this scale?"
    ],
    "severity": "high"
  },
  "accessibility": {
    "additionalPrompts": [
      "Are all interactive elements keyboard accessible?",
      "Do images have alt text?",
      "Is color contrast WCAG AA compliant?",
      "Are form fields properly labeled?",
      "Is screen reader support tested?"
    ],
    "severity": "medium"
  },
  "maintainability": {
    "additionalPrompts": [
      "Is the code self-documenting with clear naming?",
      "Are complex algorithms explained with comments?",
      "Is the architecture easy for new developers to understand?",
      "Are there clear separation of concerns?",
      "Is technical debt documented?"
    ],
    "severity": "medium"
  },
  "cost": {
    "additionalPrompts": [
      "What are the API call costs for this implementation?",
      "Can caching reduce external service usage?",
      "Are cloud resources right-sized (not over-provisioned)?",
      "Is there a more cost-effective approach?",
      "Are costs within budget constraints?"
    ],
    "severity": "high"
  }
}
```

**Outputs:**
- `src/config/qa-prompts.json` (800+ lines)
- `src/config/qa-perspectives.json`

**Success Criteria:**
- 50+ QA prompt sets covering common file types
- Perspective overlays for 5+ audit dimensions
- Automated checks defined where applicable

---

### Sprint 007-B: Context Detection & Prompt Selection (1 day)

**Goal:** Automatically detect what the AI is working on and select appropriate QA prompts

**Tasks:**

1. **Create Context Detector**

**File:** `src/tools/detect-qa-context.ts`

```typescript
import * as path from 'path';

export interface QAContext {
  category: 'code' | 'documentation' | 'configuration' | 'tests' | 'database' | 'other';
  subCategory?: string;
  fileExtension: string;
  filePath: string;
  language?: string;
  framework?: string;
  selectedPrompts: string[];
  automatedChecks: string[];
  perspective?: string; // From workflow params
  additionalPrompts: string[];
}

export async function detectQAContext(input: {
  filePath?: string;
  fileContent?: string;
  workflowPerspective?: string;
  taskDescription?: string;
}): Promise<QAContext> {
  const context: QAContext = {
    category: 'other',
    fileExtension: '',
    filePath: input.filePath || '',
    selectedPrompts: [],
    automatedChecks: [],
    additionalPrompts: []
  };
  
  if (!input.filePath) {
    return context;
  }
  
  const ext = path.extname(input.filePath).toLowerCase();
  const basename = path.basename(input.filePath).toLowerCase();
  const dirname = path.dirname(input.filePath).toLowerCase();
  
  context.fileExtension = ext;
  
  // Detect category and subcategory
  if (['.py', '.ts', '.js', '.jsx', '.tsx', '.java', '.go', '.rs'].includes(ext)) {
    context.category = 'code';
    context.language = detectLanguage(ext);
    context.framework = detectFramework(input.fileContent || '', context.language);
    context.subCategory = context.language;
  } else if (['.md', '.rst', '.txt', '.adoc'].includes(ext) || basename.includes('readme')) {
    context.category = 'documentation';
    context.subCategory = detectDocType(basename, input.fileContent || '');
  } else if (['.json', '.yaml', '.yml', '.toml', '.ini', '.env'].includes(ext)) {
    context.category = 'configuration';
    context.subCategory = ext.slice(1); // Remove dot
  } else if (basename.includes('test') || basename.includes('spec') || dirname.includes('test')) {
    context.category = 'tests';
    context.subCategory = detectTestType(input.taskDescription || '', dirname);
  } else if (ext === '.sql' || dirname.includes('migration') || dirname.includes('schema')) {
    context.category = 'database';
    context.subCategory = dirname.includes('migration') ? 'migration' : 'schema';
  }
  
  // Load prompts based on context
  context.selectedPrompts = loadPromptsForContext(context);
  
  // Load automated checks
  context.automatedChecks = loadAutomatedChecks(context);
  
  // Add perspective-based prompts
  if (input.workflowPerspective) {
    context.perspective = input.workflowPerspective;
    context.additionalPrompts = loadPerspectivePrompts(input.workflowPerspective);
  }
  
  return context;
}

function detectLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.py': 'python',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust'
  };
  return map[ext] || 'unknown';
}

function detectFramework(content: string, language: string): string | undefined {
  if (language === 'typescript' || language === 'javascript') {
    if (content.includes('React') || content.includes('useState')) return 'react';
    if (content.includes('Vue')) return 'vue';
    if (content.includes('fastify')) return 'fastify';
    if (content.includes('express')) return 'express';
  }
  if (language === 'python') {
    if (content.includes('fastapi') || content.includes('FastAPI')) return 'fastapi';
    if (content.includes('flask')) return 'flask';
    if (content.includes('django')) return 'django';
  }
  return undefined;
}

function detectDocType(basename: string, content: string): string {
  if (basename.includes('readme')) return 'readme';
  if (basename.includes('api') || content.includes('# API')) return 'api-docs';
  return 'technical-guide';
}

function detectTestType(taskDescription: string, dirname: string): string {
  if (dirname.includes('integration') || taskDescription.includes('integration')) {
    return 'integration';
  }
  return 'unit';
}

function loadPromptsForContext(context: QAContext): string[] {
  // Load from qa-prompts.json
  const prompts = require('../../config/qa-prompts.json');
  const categoryPrompts = prompts[context.category];
  
  if (!categoryPrompts) return [];
  
  if (context.subCategory && categoryPrompts[context.subCategory]) {
    return categoryPrompts[context.subCategory].prompts || [];
  }
  
  // Fallback to general category prompts
  if (categoryPrompts.general) {
    return categoryPrompts.general.prompts || [];
  }
  
  return [];
}

function loadAutomatedChecks(context: QAContext): string[] {
  const prompts = require('../../config/qa-prompts.json');
  const categoryPrompts = prompts[context.category];
  
  if (!categoryPrompts) return [];
  
  if (context.subCategory && categoryPrompts[context.subCategory]) {
    return categoryPrompts[context.subCategory].automatedChecks || [];
  }
  
  return [];
}

function loadPerspectivePrompts(perspective: string): string[] {
  const perspectives = require('../../config/qa-perspectives.json');
  const perspectiveData = perspectives[perspective.toLowerCase()];
  
  if (!perspectiveData) return [];
  
  return perspectiveData.additionalPrompts || [];
}
```

2. **Create Prompt Injection System**

**File:** `src/tools/inject-qa-prompts.ts`

```typescript
import { detectQAContext, QAContext } from './detect-qa-context.js';

export interface QAInjection {
  context: QAContext;
  fullPrompt: string;
  automatedChecks: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function injectQAPrompts(input: {
  taskDescription: string;
  filePath?: string;
  fileContent?: string;
  workflowPerspective?: string;
}): Promise<QAInjection> {
  // Detect context
  const context = await detectQAContext({
    filePath: input.filePath,
    fileContent: input.fileContent,
    workflowPerspective: input.workflowPerspective,
    taskDescription: input.taskDescription
  });
  
  // Build full QA prompt
  const fullPrompt = buildQAPrompt(context, input.taskDescription);
  
  // Determine severity
  const severity = determineSeverity(context);
  
  return {
    context,
    fullPrompt,
    automatedChecks: context.automatedChecks,
    severity
  };
}

function buildQAPrompt(context: QAContext, taskDescription: string): string {
  let prompt = `# Quality Assurance Checklist\n\n`;
  prompt += `**Task:** ${taskDescription}\n`;
  prompt += `**Context:** ${context.category}`;
  if (context.subCategory) prompt += ` (${context.subCategory})`;
  if (context.perspective) prompt += ` | Perspective: ${context.perspective}`;
  prompt += `\n\n`;
  
  // Add base prompts
  if (context.selectedPrompts.length > 0) {
    prompt += `## ${context.category.charAt(0).toUpperCase() + context.category.slice(1)} Quality Checks:\n\n`;
    context.selectedPrompts.forEach((p, i) => {
      prompt += `${i + 1}. ${p}\n`;
    });
    prompt += `\n`;
  }
  
  // Add perspective prompts
  if (context.additionalPrompts.length > 0) {
    prompt += `## ${context.perspective?.charAt(0).toUpperCase()}${context.perspective?.slice(1)} Perspective:\n\n`;
    context.additionalPrompts.forEach((p, i) => {
      prompt += `${i + 1}. ${p}\n`;
    });
    prompt += `\n`;
  }
  
  // Add automated checks section
  if (context.automatedChecks.length > 0) {
    prompt += `## Automated Checks (run these):\n\n`;
    prompt += '```bash\n';
    context.automatedChecks.forEach(check => {
      prompt += `${check}\n`;
    });
    prompt += '```\n\n';
  }
  
  prompt += `## Self-Review:\n\n`;
  prompt += `Before submitting, review your work against the above criteria. `;
  prompt += `Note any items that need attention or couldn't be fully addressed.\n\n`;
  prompt += `**Quality Score:** Rate your work 1-10 based on these criteria.\n`;
  prompt += `**Issues Found:** List any problems discovered during self-review.\n`;
  prompt += `**Mitigations:** Explain how critical issues were resolved or will be addressed.\n`;
  
  return prompt;
}

function determineSeverity(context: QAContext): 'low' | 'medium' | 'high' | 'critical' {
  // Security and database changes are critical
  if (context.perspective === 'security' || context.category === 'database') {
    return 'critical';
  }
  
  // Performance and cost perspectives are high
  if (context.perspective === 'performance' || context.perspective === 'cost') {
    return 'high';
  }
  
  // Code and tests are medium
  if (context.category === 'code' || context.category === 'tests') {
    return 'medium';
  }
  
  // Documentation and config are low
  return 'low';
}
```

**Outputs:**
- `src/tools/detect-qa-context.ts`
- `src/tools/inject-qa-prompts.ts`
- `tests/tools/qa-detection.test.ts`

**Success Criteria:**
- Correctly detects file type in >95% of cases
- Loads appropriate prompts for detected context
- Perspective prompts overlay correctly
- Severity calculation is logical

---

### Sprint 007-C: Workflow Integration & Injection Points (1 day)

**Goal:** Integrate QA prompt injection into workflow execution at strategic points

**Tasks:**

1. **Update Workflow Executor**

**File:** `src/tools/execute-workflow.ts` (modifications)

```typescript
import { injectQAPrompts } from './inject-qa-prompts.js';

export async function executeWorkflow(input: ExecuteWorkflowInput): Promise<any> {
  const reporter = new ProgressReporter(11);
  const qaResults: any[] = [];
  
  console.log(`🚀 Launching workflow: ${input.template}`);
  console.log(`Goal: ${input.goal}`);
  console.log(`QA Mode: ${input.enableQA !== false ? 'ENABLED' : 'DISABLED'}\n`);
  
  // ... Steps 1-4 (requirements, validation, debate, approval)
  
  // Step 5: Create sprint plan
  reporter.report(5, 'Creating sprint plan', 'in-progress');
  const sprintPlan = await step5_createSprintPlan(input);
  reporter.report(5, 'Sprint plan created', 'completed');
  
  // ** QA INJECTION POINT 1: Review sprint plan **
  if (input.enableQA !== false) {
    const qaCheck1 = await performQACheck({
      stage: 'sprint-plan',
      content: sprintPlan,
      taskDescription: 'Sprint plan review',
      perspective: input.perspective
    });
    qaResults.push(qaCheck1);
  }
  
  // Step 6: Create detailed tasks
  reporter.report(6, 'Creating detailed task specs', 'in-progress');
  const tasks = await step6_createDetailedTasks(sprintPlan, input.taskCount);
  reporter.report(6, `${tasks.length} tasks created`, 'completed');
  
  // ** QA INJECTION POINT 2: Review task breakdown **
  if (input.enableQA !== false) {
    const qaCheck2 = await performQACheck({
      stage: 'task-breakdown',
      content: tasks,
      taskDescription: 'Task breakdown review',
      perspective: input.perspective
    });
    qaResults.push(qaCheck2);
  }
  
  // Steps 7-9: Execute tasks
  reporter.report(7, 'Executing tasks sequentially', 'in-progress');
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n  🔷 Task ${i + 1}/${tasks.length}: ${task.title}`);
    
    // Execute task
    const taskResult = await executeTask(task);
    
    // ** QA INJECTION POINT 3: Review each completed task **
    if (input.enableQA !== false) {
      const qaCheck = await performQACheck({
        stage: 'task-execution',
        content: taskResult,
        taskDescription: task.title,
        filePath: taskResult.files?.[0], // First modified file
        fileContent: taskResult.code, // Code if available
        perspective: input.perspective
      });
      
      qaResults.push(qaCheck);
      
      // If critical QA failure, halt workflow
      if (qaCheck.severity === 'critical' && qaCheck.passed !== true) {
        console.log(`\n  ❌ CRITICAL QA FAILURE on task ${i + 1}`);
        console.log(`  Issue: ${qaCheck.issues[0]}`);
        console.log(`  Workflow halted for manual review.`);
        
        throw new Error(`QA failure: ${qaCheck.issues[0]}`);
      }
    }
  }
  
  reporter.report(9, 'All tasks executed', 'completed');
  
  // Step 11: Final QA
  reporter.report(11, 'Running final QA confirmation', 'in-progress');
  
  if (input.enableQA !== false) {
    const finalQA = await performFinalQA({
      allTasks: tasks,
      qaResults,
      perspective: input.perspective
    });
    
    if (!finalQA.passed) {
      console.log(`\n⚠️ Final QA identified ${finalQA.issues.length} issues:`);
      finalQA.issues.forEach((issue: string, i: number) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    } else {
      console.log(`\n✅ Final QA passed with score: ${finalQA.qualityScore}/10`);
    }
    
    qaResults.push(finalQA);
  }
  
  reporter.report(11, 'QA confirmation complete', 'completed');
  
  // Generate summary including QA results
  const summary = generateSummaryWithQA(result, qaResults);
  
  return summary;
}

async function performQACheck(input: any): Promise<any> {
  console.log(`\n  🔍 Running QA check: ${input.stage}...`);
  
  // Inject appropriate QA prompts
  const qaInjection = await injectQAPrompts({
    taskDescription: input.taskDescription,
    filePath: input.filePath,
    fileContent: input.fileContent,
    workflowPerspective: input.perspective
  });
  
  console.log(`  📋 Context: ${qaInjection.context.category} (${qaInjection.context.subCategory || 'general'})`);
  console.log(`  ⚡ Severity: ${qaInjection.severity}`);
  console.log(`  ✓ ${qaInjection.context.selectedPrompts.length} checks queued`);
  
  // Delegate QA to appropriate agent (Gemini for code review, Claude for editorial)
  const agent = selectAgentForQA(qaInjection.context.category);
  
  const qaResult = await delegateTask({
    agent,
    task: {
      type: 'quality-review',
      prompt: qaInjection.fullPrompt,
      content: input.content,
      automatedChecks: qaInjection.automatedChecks
    }
  });
  
  // Run automated checks if available
  if (qaInjection.automatedChecks.length > 0 && input.filePath) {
    console.log(`  🤖 Running ${qaInjection.automatedChecks.length} automated checks...`);
    for (const check of qaInjection.automatedChecks) {
      const checkCommand = check.replace('{file}', input.filePath);
      try {
        await runCommand(checkCommand);
        console.log(`    ✅ ${checkCommand}`);
      } catch (error) {
        console.log(`    ❌ ${checkCommand} failed`);
        qaResult.automatedChecksFailed = true;
        qaResult.issues.push(`Automated check failed: ${checkCommand}`);
      }
    }
  }
  
  return {
    stage: input.stage,
    context: qaInjection.context,
    severity: qaInjection.severity,
    passed: qaResult.qualityScore >= 7 && !qaResult.automatedChecksFailed,
    qualityScore: qaResult.qualityScore,
    issues: qaResult.issues || [],
    mitigations: qaResult.mitigations || [],
    timestamp: new Date().toISOString()
  };
}

function selectAgentForQA(category: string): 'claude' | 'gemini' | 'codex' {
  // Gemini for code review (better at reading code)
  if (category === 'code' || category === 'tests') {
    return 'gemini';
  }
  
  // Claude for editorial review (docs, user-facing content)
  if (category === 'documentation') {
    return 'claude';
  }
  
  // Codex for configs and database (practical validation)
  if (category === 'configuration' || category === 'database') {
    return 'codex';
  }
  
  return 'gemini'; // Default
}
```

2. **Create QA Report Generator**

**File:** `src/tools/generate-qa-report.ts`

```typescript
export function generateQAReport(qaResults: any[]): string {
  let report = `\n# 📊 Quality Assurance Report\n\n`;
  
  const totalChecks = qaResults.length;
  const passed = qaResults.filter(r => r.passed).length;
  const failed = qaResults.filter(r => !r.passed).length;
  const avgScore = qaResults.reduce((sum, r) => sum + r.qualityScore, 0) / totalChecks;
  
  report += `**Overall:**\n`;
  report += `- Checks performed: ${totalChecks}\n`;
  report += `- Passed: ${passed} ✅\n`;
  report += `- Failed: ${failed} ❌\n`;
  report += `- Average quality score: ${avgScore.toFixed(1)}/10\n\n`;
  
  // Group by severity
  const critical = qaResults.filter(r => r.severity === 'critical');
  const high = qaResults.filter(r => r.severity === 'high');
  const medium = qaResults.filter(r => r.severity === 'medium');
  
  if (critical.length > 0) {
    report += `## 🚨 Critical Issues\n\n`;
    critical.forEach(r => {
      report += `### ${r.stage}\n`;
      report += `- Score: ${r.qualityScore}/10 ${r.passed ? '✅' : '❌'}\n`;
      if (r.issues.length > 0) {
        report += `- Issues:\n`;
        r.issues.forEach((issue: string) => report += `  - ${issue}\n`);
      }
      if (r.mitigations.length > 0) {
        report += `- Mitigations:\n`;
        r.mitigations.forEach((m: string) => report += `  - ${m}\n`);
      }
      report += `\n`;
    });
  }
  
  // Detailed breakdown by stage
  report += `## Detailed Results\n\n`;
  qaResults.forEach((r, i) => {
    const icon = r.passed ? '✅' : '❌';
    report += `${i + 1}. ${icon} **${r.stage}** (${r.context.category})\n`;
    report += `   - Quality score: ${r.qualityScore}/10\n`;
    report += `   - Severity: ${r.severity}\n`;
    if (r.issues.length > 0) {
      report += `   - Issues: ${r.issues.join(', ')}\n`;
    }
  });
  
  return report;
}
```

**Outputs:**
- Updated `src/tools/execute-workflow.ts`
- `src/tools/generate-qa-report.ts`
- `tests/integration/qa-workflow.test.ts`

**Success Criteria:**
- QA checks run after sprint plan creation
- QA checks run after task breakdown
- QA checks run after each task execution
- Final QA summary includes all check results
- Critical failures halt workflow
- QA report is comprehensive and actionable

---

### Sprint 007-D: Self-Review System & Quality Scoring (1 day)

**Goal:** Agent reviews its own output before reporting back

**Tasks:**

1. **Self-Review Protocol**

**File:** `src/tools/self-review.ts`

```typescript
export interface SelfReviewResult {
  qualityScore: number; // 1-10
  issues: string[];
  mitigations: string[];
  confidence: number; // 0-1
  recommendations: string[];
}

export async function performSelfReview(input: {
  taskType: string;
  output: any;
  qaPrompts: string[];
  agent: 'claude' | 'gemini' | 'codex';
}): Promise<SelfReviewResult> {
  const selfReviewPrompt = buildSelfReviewPrompt(input);
  
  // Agent reviews its own work
  const review = await callAgent(input.agent, selfReviewPrompt);
  
  return parseSelfReviewResponse(review);
}

function buildSelfReviewPrompt(input: any): string {
  return `
# Self-Review Task

You just completed: **${input.taskType}**

Your output:
\`\`\`
${JSON.stringify(input.output, null, 2)}
\`\`\`

## Quality Criteria:
${input.qaPrompts.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

## Self-Review Instructions:

1. **Objectively evaluate your work** against the quality criteria above
2. **Be honest about shortcomings** - this helps improve future work
3. **Identify specific issues** with line numbers or examples where applicable
4. **Propose mitigations** for any issues found
5. **Rate your work 1-10** based on the criteria

## Response Format:

**Quality Score:** [1-10]

**Issues Found:**
- [Issue 1 with specific details]
- [Issue 2 with specific details]

**Mitigations:**
- [How issue 1 was addressed or will be]
- [How issue 2 was addressed or will be]

**Confidence:** [low/medium/high] - How confident are you this work is production-ready?

**Recommendations:**
- [Additional improvements that could be made]

Be thorough and honest in your self-assessment.
  `.trim();
}

function parseSelfReviewResponse(response: string): SelfReviewResult {
  // Parse LLM response for structured data
  const scoreMatch = response.match(/Quality Score:\s*(\d+)/i);
  const qualityScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
  
  const issuesSection = response.match(/Issues Found:([\s\S]*?)(?=\*\*|$)/i);
  const issues = issuesSection 
    ? issuesSection[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];
  
  const mitigationsSection = response.match(/Mitigations:([\s\S]*?)(?=\*\*|$)/i);
  const mitigations = mitigationsSection
    ? mitigationsSection[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];
  
  const confidenceMatch = response.match(/Confidence:\s*(low|medium|high)/i);
  const confidenceMap: Record<string, number> = { low: 0.4, medium: 0.7, high: 0.9 };
  const confidence = confidenceMatch 
    ? confidenceMap[confidenceMatch[1].toLowerCase()] 
    : 0.7;
  
  const recommendationsSection = response.match(/Recommendations:([\s\S]*?)$/i);
  const recommendations = recommendationsSection
    ? recommendationsSection[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
    : [];
  
  return {
    qualityScore,
    issues,
    mitigations,
    confidence,
    recommendations
  };
}
```

2. **Quality Score Tracking**

**File:** `src/state/quality-tracker.ts`

```typescript
export interface QualityMetrics {
  workflowId: string;
  timestamp: Date;
  averageQualityScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalFailures: number;
  byAgent: {
    claude: { avgScore: number; checks: number };
    gemini: { avgScore: number; checks: number };
    codex: { avgScore: number; checks: number };
  };
  byCategory: Record<string, { avgScore: number; checks: number }>;
}

export class QualityTracker {
  private metrics: QualityMetrics[] = [];
  
  recordQAResult(result: any, agent: string, workflowId: string) {
    // Track metrics over time
    const existing = this.metrics.find(m => m.workflowId === workflowId);
    
    if (existing) {
      existing.totalChecks++;
      if (result.passed) existing.passedChecks++;
      else existing.failedChecks++;
      if (result.severity === 'critical' && !result.passed) existing.criticalFailures++;
      
      // Update agent-specific metrics
      const agentMetrics = existing.byAgent[agent as keyof typeof existing.byAgent];
      agentMetrics.avgScore = (agentMetrics.avgScore * agentMetrics.checks + result.qualityScore) / (agentMetrics.checks + 1);
      agentMetrics.checks++;
      
      // Update category metrics
      const category = result.context.category;
      if (!existing.byCategory[category]) {
        existing.byCategory[category] = { avgScore: 0, checks: 0 };
      }
      const catMetrics = existing.byCategory[category];
      catMetrics.avgScore = (catMetrics.avgScore * catMetrics.checks + result.qualityScore) / (catMetrics.checks + 1);
      catMetrics.checks++;
      
      // Recalculate overall average
      existing.averageQualityScore = Object.values(existing.byCategory)
        .reduce((sum, cat) => sum + cat.avgScore, 0) / Object.keys(existing.byCategory).length;
    }
  }
  
  getWorkflowMetrics(workflowId: string): QualityMetrics | undefined {
    return this.metrics.find(m => m.workflowId === workflowId);
  }
  
  generateTrendReport(): string {
    // Compare recent workflows to identify quality trends
    const recent = this.metrics.slice(-10);
    const avgScore = recent.reduce((sum, m) => sum + m.averageQualityScore, 0) / recent.length;
    const passRate = recent.reduce((sum, m) => sum + (m.passedChecks / m.totalChecks), 0) / recent.length;
    
    return `
Quality Trends (last 10 workflows):
- Average quality score: ${avgScore.toFixed(1)}/10
- Pass rate: ${(passRate * 100).toFixed(0)}%
- Most common issues: [analyze and report]
    `.trim();
  }
}
```

**Outputs:**
- `src/tools/self-review.ts`
- `src/state/quality-tracker.ts`
- Integration with workflow executor

**Success Criteria:**
- Agent performs self-review before reporting
- Quality scores are meaningful (correlate with actual quality)
- Metrics tracked over time
- Trend analysis identifies patterns

---

## Configuration

**Add to `.env`:**

```bash
# QA Settings
QA_ENABLED=true                       # Enable automatic QA injection
QA_HALT_ON_CRITICAL=true              # Stop workflow on critical QA failures
QA_SELF_REVIEW=true                   # Agents review own work before reporting
QA_AUTOMATED_CHECKS=true              # Run automated linting/testing where available
QA_MIN_QUALITY_SCORE=7                # Minimum acceptable quality score (1-10)
QA_AGENT_SELECTION=auto               # auto | claude | gemini | codex
```

---

## Success Metrics

| Metric | Target | Impact |
|--------|--------|--------|
| Early issue detection | >60% issues found before final QA | Reduces rework |
| Quality score accuracy | Scores correlate with actual quality | Trustworthy metrics |
| False positive rate | <10% of QA failures are invalid | Minimal noise |
| Token efficiency | <200 tokens per QA check | Minimal overhead |
| Rework reduction | 50% fewer revisions needed | Time savings |

---

## Expected Outputs

1. ✅ QA prompt library (800+ lines, 50+ contexts)
2. ✅ Context detection system
3. ✅ Automatic prompt injection at 3+ workflow stages
4. ✅ Self-review system
5. ✅ Quality scoring and tracking
6. ✅ Comprehensive QA reports
7. ✅ Automated checks integration

---

## Timeline

```
Day 1: Sprint 007-A (QA Prompt Library)
Day 2: Sprint 007-B (Context Detection & Selection)
Day 3: Sprint 007-C (Workflow Integration)
Day 4: Sprint 007-D (Self-Review & Tracking)

Total: 3-4 days
```

---

## Integration with Existing Sprints

**Sprint 003 (execute_workflow):** Add QA injection points  
**Sprint 004 (Config):** Add QA configuration variables  
**Sprint 006 (Auto-orchestration):** QA prompts injected automatically based on detected context

---

## Future Enhancements

- ML-based quality prediction (predict likely issues before they occur)
- Learning system (improve prompts based on historical issues)
- Custom QA templates per project
- Integration with CI/CD pipelines
- Visual quality dashboard

---

## Notes

- Start with non-blocking QA (warnings only) and gradually enable halt-on-critical
- Self-review is critical - agents catch their own mistakes before reporting
- Automated checks where available dramatically improve reliability
- Quality scoring provides trend analysis over time
- Context-aware prompts are much more effective than generic checklists
