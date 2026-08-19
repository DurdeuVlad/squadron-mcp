import type { PromptDefinition } from "./types.js";

export const reviewReportPrompt: PromptDefinition = {
  name: "review_report",
  title: "Review a task's execution report",
  description: "Walks through collecting and reviewing the report for a completed task.",
  arguments: [{ name: "taskId", description: "The task to review", required: true }],
  build: (args) => {
    const taskId = args?.taskId ?? "<taskId>";
    const text = [
      `Review the execution report for task ${taskId}.`,
      "",
      `1. Call \`collect_report\` with taskId: "${taskId}" to fetch the normalized report (summary, outputs, issues, recommendations, metrics).`,
      "2. Call `review_output` with the same taskId to run it through the quality gates and get a pass/fail verdict.",
      "3. Check the report's `issues` and `recommendations` fields specifically — a `completed` status doesn't mean issue-free; the executor may have flagged concerns worth a second look before treating the task as truly done.",
    ].join("\n");

    return {
      messages: [{ role: "user", content: { type: "text", text } }],
    };
  },
};
