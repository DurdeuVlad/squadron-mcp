import type { PromptDefinition } from "./types.js";

export const optimizeTokensPrompt: PromptDefinition = {
  name: "optimize_tokens",
  title: "Check token usage and optimization opportunities",
  description: "Walks through checking token usage for a task or workflow and when to compact context.",
  arguments: [
    { name: "taskId", description: "A specific task to check (omit for workflow/global usage)", required: false },
  ],
  build: (args) => {
    const taskId = args?.taskId;
    const text = [
      taskId
        ? `Call \`optimize_tokens\` with taskId: "${taskId}" to see token usage and savings recommendations for that task.`
        : "Call `optimize_tokens` (optionally scoped to a workflowId) to see aggregate token usage and savings recommendations.",
      "",
      "Use this before starting a large multi-step workflow to estimate cost, and again partway through if it's running longer than expected — the tool flags when accumulated context is worth compacting rather than carrying forward in full.",
    ].join("\n");

    return {
      messages: [{ role: "user", content: { type: "text", text } }],
    };
  },
};
