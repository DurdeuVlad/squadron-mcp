import type {
  BuiltCommand,
  CommandConfigInput,
  PromptBuildInput,
  PromptBuildResult,
} from "./types.js";

const DEFAULT_PROMPT_PLACEHOLDER = "{prompt}";

export function buildExecutorPrompt(input: PromptBuildInput): PromptBuildResult {
  const prompt = [
    "You are executing a delegated orchestration task.",
    "Follow the task instructions and return ONLY valid JSON (no markdown, no commentary).",
    "Required JSON shape:",
    '{"summary":"string","outputs":["string"],"issues":["string"],"recommendations":["string"],"metrics":{"tokensUsed":number,"durationSeconds":number,"testsPassed":number,"testsTotal":number,"buildSuccess":boolean}}',
    "",
    `Task: ${input.taskName}`,
    "",
    input.formattedTask,
  ].join("\n");

  return { prompt };
}

export function buildCommand(
  config: CommandConfigInput,
  prompt: string,
  overrides?: { model?: string }
): BuiltCommand {
  const placeholder = config.promptPlaceholder ?? DEFAULT_PROMPT_PLACEHOLDER;
  const args = config.args.map((arg) =>
    arg.includes(placeholder) ? arg.replaceAll(placeholder, prompt) : arg
  );

  const hasPromptInArgs = args.some((arg) => arg.includes(prompt));
  const baseArgs = hasPromptInArgs || config.passPromptViaStdin ? args : [...args, prompt];

  const model = overrides?.model;
  const modelArgs =
    model && config.modelFlag
      ? config.modelFlag.map((arg) => arg.replaceAll("{model}", model))
      : [];

  const command: BuiltCommand = {
    command: config.command,
    args: [...baseArgs, ...modelArgs],
    cwd: config.cwd,
    env: config.env,
    successExitCodes: config.successExitCodes,
  };

  if (config.passPromptViaStdin) {
    command.stdin = prompt;
  }

  return command;
}
