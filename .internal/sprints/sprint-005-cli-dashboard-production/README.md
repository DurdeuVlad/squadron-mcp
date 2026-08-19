# Sprint 005: CLI, Dashboard & Production Readiness

**Sprint Goal:** Add CLI for standalone usage, observability dashboard, persistent storage, and prepare for npm publishing

**Duration:** 3-4 days (6-8 hours)

**Priority:** HIGH (production readiness and distribution)

---

## Problem Statement

To make the orchestrator production-ready and publicly usable, we need:

1. **CLI** - Standalone command-line interface for manual orchestration
2. **Dashboard** - Visual monitoring of workflows and token usage
3. **Persistent Storage** - Save state to disk (SQLite or JSON files)
4. **Documentation** - Comprehensive guides and API reference
5. **Publishing** - Prepare for npm distribution

---

## Tasks

### Task 1: CLI Implementation 🖥️
**Estimated Complexity:** High  
**Time:** 2-3 hours

**Purpose:** Provide command-line interface for orchestrator operations

**Steps:**
1. Create src/cli.ts
2. Implement CLI commands (init, task, workflow, metrics)
3. Add interactive prompts
4. Add output formatting (colors, tables)
5. Write CLI tests
6. Document CLI usage

**Implementation:**
```typescript
// src/cli.ts
#!/usr/bin/env node

import { Command } from "commander";
import { TemplateLoader } from "./templates/loader.js";
import { StateManager } from "./state/state-manager.js";
import { ConfigLoader } from "./config/loader.js";
import { createTaskSpec } from "./tools/create-task-spec.js";
import { delegateTask } from "./tools/delegate-task.js";
import { trackWorkflow } from "./tools/track-workflow.js";
import { TokenTracker } from "./metrics/token-tracker.js";

const program = new Command();

program
  .name("squadron")
  .description("CLI for Squadron")
  .version("0.1.0");

// Init command
program
  .command("init")
  .description("Initialize orchestrator in current directory")
  .action(async () => {
    console.log("Initializing orchestrator...");
    // Create squadron-config.json
    // Create templates/ directory
    console.log("✅ Orchestrator initialized");
  });

// Task create command
program
  .command("task create")
  .description("Create a new task")
  .option("-t, --task <description>", "Task description")
  .option("-e, --executor <agent>", "Executor agent name")
  .option("--template <name>", "Template name")
  .action(async (options) => {
    const configLoader = new ConfigLoader();
    const config = await configLoader.load();
    
    const templateLoader = new TemplateLoader();
    const stateManager = new StateManager();

    const taskSpec = await createTaskSpec(
      {
        task: options.task,
        executor: options.executor,
        template: options.template,
      },
      templateLoader,
      stateManager
    );

    console.log("✅ Task created:");
    console.log(JSON.stringify(taskSpec, null, 2));
  });

// Workflow track command
program
  .command("workflow track <workflowId>")
  .description("Track workflow progress")
  .action(async (workflowId) => {
    const stateManager = new StateManager();
    const status = trackWorkflow({ workflowId }, stateManager);
    console.log(status);
  });

// Metrics command
program
  .command("metrics")
  .description("View token usage metrics")
  .option("-w, --workflow <id>", "Workflow ID")
  .option("--export <format>", "Export format (json|csv)")
  .action(async (options) => {
    const configLoader = new ConfigLoader();
    const config = await configLoader.load();
    const stateManager = new StateManager();
    const tokenTracker = new TokenTracker(config, stateManager);

    if (options.workflow) {
      const report = tokenTracker.generateReport(options.workflow);
      console.log(report);

      if (options.export) {
        // Export to file
      }
    } else {
      // Show aggregate metrics
    }
  });

program.parse();
```

**Dependencies:**
```bash
npm install commander inquirer chalk cli-table3
```

**Success Criteria:**
- CLI commands work
- Interactive prompts functional
- Output formatted and colored
- Help documentation complete

---

### Task 2: Dashboard (Simple Web UI) 📊
**Estimated Complexity:** High  
**Time:** 2-3 hours

**Purpose:** Visual monitoring dashboard for workflows and metrics

**Steps:**
1. Create simple Express server (src/dashboard/server.ts)
2. Create HTML/CSS/JS dashboard (src/dashboard/public/)
3. Implement REST API for state access
4. Display workflows, tasks, token metrics
5. Add real-time updates (polling or SSE)
6. Write tests

**Implementation:**
```typescript
// src/dashboard/server.ts
import express from "express";
import { StateManager } from "../state/state-manager.js";
import { TokenTracker } from "../metrics/token-tracker.js";

export function createDashboard(
  stateManager: StateManager,
  tokenTracker: TokenTracker,
  port: number = 3000
) {
  const app = express();

  app.use(express.static("dist/dashboard/public"));

  // API endpoints
  app.get("/api/workflows", (req, res) => {
    // Return all workflows
    res.json({ workflows: [] });
  });

  app.get("/api/workflows/:id", (req, res) => {
    const workflow = stateManager.getWorkflow(req.params.id);
    res.json(workflow);
  });

  app.get("/api/metrics", (req, res) => {
    // Return aggregate metrics
    res.json({ metrics: {} });
  });

  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });

  return app;
}
```

**Dashboard HTML (simplified):**
```html
<!-- src/dashboard/public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Agent Orchestrator Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .workflow {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .task {
      background: #f5f5f5;
      padding: 8px;
      margin: 8px 0;
      border-radius: 4px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .metric-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Agent Orchestrator Dashboard</h1>
  
  <section class="metrics">
    <div class="metric-card">
      <h3>Total Workflows</h3>
      <div id="total-workflows">0</div>
    </div>
    <div class="metric-card">
      <h3>Total Tokens</h3>
      <div id="total-tokens">0</div>
    </div>
    <div class="metric-card">
      <h3>Tokens Saved</h3>
      <div id="tokens-saved">0</div>
    </div>
    <div class="metric-card">
      <h3>Cost</h3>
      <div id="total-cost">$0.00</div>
    </div>
  </section>

  <section>
    <h2>Active Workflows</h2>
    <div id="workflows"></div>
  </section>

  <script>
    async function loadDashboard() {
      const response = await fetch("/api/workflows");
      const data = await response.json();
      
      // Update metrics
      document.getElementById("total-workflows").textContent = data.workflows.length;
      
      // Render workflows
      const workflowsDiv = document.getElementById("workflows");
      workflowsDiv.innerHTML = data.workflows
        .map(w => `
          <div class="workflow">
            <h3>${w.name || w.id}</h3>
            <p>Status: ${w.status}</p>
            <p>Tasks: ${w.tasks.length}</p>
          </div>
        `)
        .join("");
    }

    // Load on page load
    loadDashboard();

    // Refresh every 5 seconds
    setInterval(loadDashboard, 5000);
  </script>
</body>
</html>
```

**Dependencies:**
```bash
npm install express
npm install -D @types/express
```

**Success Criteria:**
- Dashboard displays workflows
- Real-time updates work
- Metrics displayed correctly
- Responsive UI

---

### Task 3: Persistent State Storage 💾
**Estimated Complexity:** Medium  
**Time:** 2 hours

**Purpose:** Save state to disk (SQLite or JSON files)

**Steps:**
1. Create src/state/storage-adapter.ts (interface)
2. Implement FileStorageAdapter (JSON files)
3. Implement SQLiteStorageAdapter (optional)
4. Update StateManager to use adapter
5. Add persistence configuration
6. Write tests

**Implementation:**
```typescript
// src/state/storage-adapter.ts
import { Task, WorkflowState } from "./types.js";

export interface StorageAdapter {
  saveTask(task: Task): Promise<void>;
  loadTask(id: string): Promise<Task | null>;
  saveWorkflow(workflow: WorkflowState): Promise<void>;
  loadWorkflow(id: string): Promise<WorkflowState | null>;
  listWorkflows(): Promise<string[]>;
}

// src/state/file-storage-adapter.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export class FileStorageAdapter implements StorageAdapter {
  constructor(private stateDir: string = "state") {}

  async saveTask(task: Task): Promise<void> {
    await mkdir(join(this.stateDir, "tasks"), { recursive: true });
    const filePath = join(this.stateDir, "tasks", `${task.id}.json`);
    await writeFile(filePath, JSON.stringify(task, null, 2));
  }

  async loadTask(id: string): Promise<Task | null> {
    try {
      const filePath = join(this.stateDir, "tasks", `${id}.json`);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveWorkflow(workflow: WorkflowState): Promise<void> {
    await mkdir(join(this.stateDir, "workflows"), { recursive: true });
    const filePath = join(this.stateDir, "workflows", `${workflow.id}.json`);
    await writeFile(filePath, JSON.stringify(workflow, null, 2));
  }

  async loadWorkflow(id: string): Promise<WorkflowState | null> {
    try {
      const filePath = join(this.stateDir, "workflows", `${id}.json`);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async listWorkflows(): Promise<string[]> {
    // Implementation
    return [];
  }
}

// Update StateManager to use adapter
export class StateManager {
  constructor(private storage: StorageAdapter = new InMemoryAdapter()) {}

  async createTask(spec: TaskSpec): Promise<Task> {
    const task: Task = { /* ... */ };
    await this.storage.saveTask(task);
    return task;
  }

  // ... other methods updated to use storage
}
```

**Success Criteria:**
- State persists to disk
- State loads on restart
- Multiple storage backends supported
- Tests verify persistence

---

### Task 4: Comprehensive Documentation 📚
**Estimated Complexity:** Medium  
**Time:** 2 hours

**Purpose:** Complete documentation for all features

**Steps:**
1. Create docs/getting-started.md
2. Create docs/api-reference.md
3. Create docs/templates.md
4. Create docs/configuration.md
5. Create docs/examples.md
6. Update README.md
7. Add inline code documentation (JSDoc)

**Documentation Structure:**
```
docs/
├── getting-started.md     # Quick start guide
├── api-reference.md       # All MCP tools documented
├── templates.md           # Template format and built-in templates
├── configuration.md       # Configuration options
├── role-boundaries.md     # Role enforcement explanation
├── token-optimization.md  # Token tracking and optimization
├── cli.md                 # CLI command reference
├── dashboard.md           # Dashboard usage
├── examples.md            # Example workflows
└── architecture.md        # System architecture
```

**Success Criteria:**
- All features documented
- Examples are runnable
- API reference complete
- Diagrams included

---

### Task 5: npm Publishing Preparation 📦
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Prepare package for npm publishing

**Steps:**
1. Update package.json (keywords, repository, etc.)
2. Create .npmignore
3. Add LICENSE file (MIT)
4. Create CONTRIBUTING.md
5. Create CHANGELOG.md
6. Test local install (`npm pack`)
7. Prepare publishing workflow

**package.json updates:**
```json
{
  "name": "squadron-mcp",
  "version": "0.1.0",
  "description": "Model Context Protocol server for coordinating multi-agent AI workflows",
  "main": "dist/index.js",
  "bin": {
    "squadron": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "templates/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "mcp",
    "model-context-protocol",
    "agent-orchestration",
    "multi-agent",
    "ai-coordination",
    "claude",
    "gemini"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/DurdeuVlad/mcp-agent-orchestrator.git"
  },
  "bugs": {
    "url": "https://github.com/DurdeuVlad/mcp-agent-orchestrator/issues"
  },
  "homepage": "https://github.com/DurdeuVlad/mcp-agent-orchestrator#readme"
}
```

**.npmignore:**
```
# Source files (publish built dist/ instead)
src/
tests/
examples/

# Development
.vscode/
.idea/
*.swp

# Config
tsconfig.json
.eslintrc.json
.prettierrc.json

# CI/CD
.github/

# Documentation source (keep only README in package)
docs/

# State and runtime
state/
_runtime/
logs/
```

**Success Criteria:**
- Package metadata complete
- LICENSE file added
- Publishable files correct
- Local install works
- Ready for `npm publish`

---

### Task 6: End-to-End Testing & Polish 🎉
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Purpose:** Complete end-to-end testing and polish

**Steps:**
1. Create e2e test suite
2. Test full orchestration workflow
3. Test CLI commands
4. Test dashboard
5. Fix any bugs found
6. Performance testing
7. Create demo video/GIF

**E2E Test Example:**
```typescript
// tests/e2e/full-workflow.test.ts
import { describe, it, expect } from "vitest";
import { TemplateLoader } from "../../src/templates/loader.js";
import { StateManager } from "../../src/state/state-manager.js";
import { createTaskSpec } from "../../src/tools/create-task-spec.js";
import { delegateTask } from "../../src/tools/delegate-task.js";
import { collectReport } from "../../src/tools/collect-report.js";

describe("End-to-End Orchestration", () => {
  it("should complete full workflow", async () => {
    const templateLoader = new TemplateLoader();
    const stateManager = new StateManager();

    // 1. Create task
    const taskSpec = await createTaskSpec(
      {
        task: "Review code",
        executor: "gemini",
        template: "code-review",
        context: { filePath: "src/index.ts" },
      },
      templateLoader,
      stateManager
    );

    expect(taskSpec.id).toBeDefined();

    // 2. Delegate task
    const formattedTask = delegateTask(
      { taskId: taskSpec.id, executor: "gemini" },
      stateManager
    );

    expect(formattedTask).toContain("Task:");

    // 3. Collect report (simulate)
    const report = collectReport(
      {
        taskId: taskSpec.id,
        report: {
          taskId: taskSpec.id,
          status: "success",
          outputs: { review: "Code looks good" },
          metrics: { testsPassed: 10, testsTotal: 10, buildSuccess: true },
        },
      },
      stateManager
    );

    expect(report).toContain("✅");

    // 4. Verify task completed
    const task = stateManager.getTask(taskSpec.id);
    expect(task?.status).toBe("completed");
  });
});
```

**Success Criteria:**
- E2E tests pass
- All features work together
- No major bugs
- Performance acceptable
- Demo created

---

## Dependencies

```
Task 1 (CLI)
  ↓
Task 2 (Dashboard) ← Task 3 (Persistent Storage)
  ↓
Task 4 (Documentation)
  ↓
Task 5 (npm Publishing Prep)
  ↓
Task 6 (E2E Testing & Polish)
```

---

## Success Criteria (Sprint Completion)

- [x] CLI functional and documented
- [x] Dashboard displays workflows and metrics
- [x] State persists to disk
- [x] Comprehensive documentation complete
- [x] Package ready for npm publishing
- [x] E2E tests pass
- [x] All previous sprint features still working
- [x] Demo walkthrough created (`docs/demo-walkthrough.md`)

---

## Verification Commands

```bash
# Build
npm run build

# Test all
npm test

# Test CLI
./dist/cli.js --help
./dist/cli.js init
./dist/cli.js metrics

# Start dashboard
node dist/dashboard/server.js

# Test package
npm pack
npm install ./mcp-agent-orchestrator-0.1.0.tgz
```

---

## Outputs

### Code Artifacts
- src/cli.ts
- src/dashboard/*
- src/state/storage-adapter.ts
- src/state/file-storage-adapter.ts
- tests/e2e/*

### Documentation
- docs/* (complete documentation)
- README.md (polished)
- CONTRIBUTING.md
- CHANGELOG.md
- LICENSE

### Distribution
- Package ready for npm publish
- Demo video/GIF

---

## Token Budget

**Estimated Token Usage:**
- Claude planning: 400 tokens
- Task specs: 250 tokens × 6 = 1500 tokens
- Gemini execution: (uses Gemini budget)
- Claude reviews: 250 tokens × 6 = 1500 tokens

**Total Claude Tokens:** ~3400 tokens

---

## Post-Sprint Actions

After this sprint, the package will be:
1. **Tested** - Comprehensive test coverage
2. **Documented** - Full documentation
3. **Packaged** - Ready for npm publishing
4. **Usable** - CLI + MCP server modes

**Next Steps (Post v0.1.0):**
- Publish to npm: `npm publish --access public`
- Create GitHub releases
- Share on Twitter, Reddit, etc.
- Gather user feedback
- Plan v0.2.0 features

---

## Future Features (v0.2.0+)

- [ ] Multi-agent workflows (>2 agents)
- [ ] Parallel task execution
- [ ] Web-based template editor
- [ ] CI/CD integration (GitHub Actions)
- [ ] Cloud state storage (Firebase, AWS S3)
- [ ] Advanced analytics and insights
- [ ] Template marketplace
- [ ] VS Code extension

---

**Status:** Completed (2026-02-12)  
**Assigned To:** Gemini (execution), Claude (review)  
**Created:** 2026-02-12  
**Updated:** 2026-02-12
