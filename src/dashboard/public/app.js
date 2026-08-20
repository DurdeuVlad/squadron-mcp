const metricsRoot = document.getElementById("metrics");
const workflowsRoot = document.getElementById("workflows");

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCost(value) {
  return `$${Number(value).toFixed(4)}`;
}

function renderOverview(overview) {
  const cards = [
    { label: "Workflows", value: formatNumber(overview.workflows ?? 0) },
    { label: "Active", value: formatNumber(overview.activeWorkflows ?? 0) },
    { label: "Total Tokens", value: formatNumber(overview.totalTokens ?? 0) },
    { label: "Avg Tokens/Task", value: formatNumber(overview.avgTokensPerTask ?? 0) },
    { label: "Cost", value: formatCost(overview.totalCost ?? 0) },
  ];

  metricsRoot.innerHTML = cards
    .map(
      (card) => `
      <article class="card">
        <div class="metric-label">${card.label}</div>
        <div class="metric-value">${card.value}</div>
      </article>
    `
    )
    .join("");
}

function renderWorkflows(workflows) {
  if (!workflows.length) {
    workflowsRoot.innerHTML = `<article class="card"><strong>No workflows yet.</strong><p class="muted">Run a task through the CLI or MCP tools to populate this dashboard.</p></article>`;
    return;
  }

  workflowsRoot.innerHTML = workflows
    .map(
      (workflow) => `
      <article class="card">
        <div class="workflow-header">
          <strong>${workflow.name || workflow.id}</strong>
          <span class="badge ${workflow.status}">${workflow.status}</span>
        </div>
        <p class="muted">ID: ${workflow.id}</p>
        <p>Tasks: ${workflow.tasks} | Tokens: ${formatNumber(workflow.tokenUsage.total)}</p>
        <p class="muted">Current task: ${workflow.currentTask || "none"}</p>
      </article>
    `
    )
    .join("");
}

async function refresh() {
  try {
    const response = await fetch("/api/workflows");
    const payload = await response.json();
    renderOverview(payload.overview || {});
    renderWorkflows(payload.workflows || []);
  } catch (error) {
    workflowsRoot.innerHTML = `<article class="card"><strong>Failed to load dashboard data.</strong><p class="muted">${String(error)}</p></article>`;
  }
}

refresh();
setInterval(refresh, 5000);
