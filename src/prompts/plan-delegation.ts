import type { PromptDefinition } from "./types.js";

export const planDelegationPrompt: PromptDefinition = {
  name: "plan_delegation",
  title: "Plan a task delegation",
  description:
    "Walks through creating a task spec and delegating it to the right agent (claude/gemini/codex).",
  arguments: [
    { name: "taskDescription", description: "What needs to be done", required: true },
    { name: "constraints", description: "Any constraints or context to consider", required: false },
  ],
  build: (args) => {
    const taskDescription = args?.taskDescription ?? "<describe the task>";
    const constraints = args?.constraints;
    const text = [
      `I need to delegate this task: "${taskDescription}"${constraints ? ` (constraints: ${constraints})` : ""}.`,
      "",
      "1. Call `create_task_spec` to turn this into a structured task spec — pick a template that fits, and let it choose a default executor unless you already know it should be claude/gemini/codex.",
      '2. Call `delegate_task` with the resulting `taskId` and `executor`. Use `executionMode: "auto"` unless you specifically need `"handoff"` (formats the task, no subprocess) or `"subprocess"` (forces a real CLI run).',
      "3. If the executor fails, check `delegationRuntime.fallbackExecutors` — a failing agent automatically retries with its configured fallback (usually codex) when `fallbackOnFailure` is enabled.",
    ].join("\n");

    return {
      messages: [{ role: "user", content: { type: "text", text } }],
    };
  },
};
