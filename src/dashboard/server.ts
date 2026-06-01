import express, { type Express } from "express";
import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TokenTracker, type TokenMetrics } from "../metrics/token-tracker.js";
import { StateManager } from "../state/state-manager.js";

export interface DashboardDependencies {
  stateManager: StateManager;
  tokenTracker: TokenTracker;
}

export interface DashboardOptions {
  port?: number;
}

export interface DashboardInstance {
  app: Express;
  httpServer: Server;
  start(): Promise<number>;
  stop(): Promise<void>;
}

function resolvePublicDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const distPublicDir = join(currentDir, "public");
  if (existsSync(distPublicDir)) {
    return distPublicDir;
  }

  return join(currentDir, "../../src/dashboard/public");
}

function computeOverview(stateManager: StateManager, tokenTracker: TokenTracker): Record<string, unknown> {
  const workflows = stateManager.listWorkflows();
  let totalTokens = 0;
  let totalSavings = 0;
  let totalCost = 0;

  for (const workflow of workflows) {
    try {
      const metrics = tokenTracker.calculateSavings(workflow.id);
      totalTokens += metrics.totalTokens;
      totalSavings += metrics.savingsVsBaseline;
      totalCost += metrics.cost;
    } catch {
      // Keep dashboard resilient for partially initialized test state.
    }
  }

  return {
    workflows: workflows.length,
    totalTokens,
    totalSavings,
    totalCost,
    activeWorkflows: workflows.filter((workflow) => workflow.status === "in-progress").length,
  };
}

export function createDashboardServer(
  deps: DashboardDependencies,
  options: DashboardOptions = {}
): DashboardInstance {
  const app = express();
  app.use(express.json());
  app.use(express.static(resolvePublicDir()));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/workflows", (_req, res) => {
    const workflows = deps.stateManager.listWorkflows().map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      currentTask: workflow.currentTask,
      startTime: workflow.startTime,
      endTime: workflow.endTime,
      tasks: workflow.tasks.length,
      tokenUsage: workflow.tokenUsage,
    }));

    res.json({
      workflows,
      overview: computeOverview(deps.stateManager, deps.tokenTracker),
    });
  });

  app.get("/api/workflows/:id", (req, res) => {
    const workflow = deps.stateManager.getWorkflow(req.params.id);
    if (!workflow) {
      res.status(404).json({ error: `Workflow not found: ${req.params.id}` });
      return;
    }

    let metrics: TokenMetrics | null = null;
    try {
      metrics = deps.tokenTracker.calculateSavings(workflow.id);
    } catch {
      metrics = null;
    }

    res.json({ workflow, metrics });
  });

  app.get("/api/metrics", (_req, res) => {
    const workflowMetrics = deps.stateManager.listWorkflows().map((workflow) => {
      try {
        return deps.tokenTracker.calculateSavings(workflow.id);
      } catch {
        return null;
      }
    });

    res.json({
      overview: computeOverview(deps.stateManager, deps.tokenTracker),
      workflowMetrics: workflowMetrics.filter((item) => item !== null),
    });
  });

  const httpServer = createServer(app);

  return {
    app,
    httpServer,
    start: async (): Promise<number> => {
      const requestedPort = options.port ?? 3000;
      await new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(requestedPort, () => {
          httpServer.off("error", reject);
          resolve();
        });
      });

      const address = httpServer.address();
      if (!address || typeof address === "string") {
        return requestedPort;
      }

      return address.port;
    },
    stop: async (): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
