# Dashboard

The dashboard provides a lightweight monitoring view for workflows and token usage.

## Start

From CLI:

```bash
squadron dashboard --port 3000
```

Programmatic:

```ts
import { createDashboardServer } from "./src/dashboard/server.js";
import { createOrchestratorServices } from "./src/tools/registry.js";

const services = createOrchestratorServices();
const dashboard = createDashboardServer(services, { port: 3000 });
await dashboard.start();
```

## Endpoints

- `GET /health`: health check
- `GET /api/workflows`: list workflows and overview metrics
- `GET /api/workflows/:id`: workflow detail + token metrics
- `GET /api/metrics`: aggregate metrics

## UI Behavior

- Auto-refresh interval: 5 seconds
- Workflow cards show status, task count, token totals, and current task
- Overview cards show workflow count, active count, token totals, savings, and cost
