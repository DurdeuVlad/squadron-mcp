import type { PromptDefinition } from "./types.js";

export const trackWorkflowStatusPrompt: PromptDefinition = {
  name: "track_workflow_status",
  title: "Check on a multi-task workflow",
  description: "Walks through checking progress on a workflow made up of multiple delegated tasks.",
  arguments: [
    {
      name: "workflowId",
      description: "The workflow to check (omit for guidance on finding one)",
      required: false,
    },
  ],
  build: (args) => {
    const workflowId = args?.workflowId;
    const text = workflowId
      ? [
          `Check progress on workflow ${workflowId}.`,
          "",
          `Call \`track_workflow\` with workflowId: "${workflowId}" to get per-task status. Look at which tasks are still \`pending\`/\`executing\` vs \`completed\`/\`failed\`. If any task is \`failed\`, review its report via \`collect_report\` before deciding whether to retry or reroute it.`,
        ].join("\n")
      : [
          "To check on a multi-task workflow, you need its workflowId — this is set when you call `create_task_spec` or `delegate_task` with a `workflowId` argument linking multiple tasks together.",
          "Once you have it, call `track_workflow` with that id to see per-task status.",
        ].join("\n");

    return {
      messages: [{ role: "user", content: { type: "text", text } }],
    };
  },
};
