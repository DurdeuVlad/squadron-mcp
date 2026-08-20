import { describe, expect, it } from "vitest";

import { buildCommand, buildExecutorPrompt } from "../../src/execution/prompt-builder.js";

describe("prompt-builder", () => {
  it("builds executor prompt with required JSON contract", () => {
    const result = buildExecutorPrompt({
      taskName: "Implement feature",
      formattedTask: "**Task:** Implement feature",
    });

    expect(result.prompt).toContain("return ONLY valid JSON");
    expect(result.prompt).toContain("Implement feature");
  });

  it("injects prompt into args using placeholder", () => {
    const command = buildCommand(
      {
        command: "gemini",
        args: ["-p", "{prompt}"],
        promptPlaceholder: "{prompt}",
        passPromptViaStdin: false,
        successExitCodes: [0],
      },
      "hello"
    );

    expect(command.args).toEqual(["-p", "hello"]);
    expect(command.stdin).toBeUndefined();
  });

  it("passes prompt via stdin when configured", () => {
    const command = buildCommand(
      {
        command: "claude",
        args: ["-p"],
        promptPlaceholder: "{prompt}",
        passPromptViaStdin: true,
        successExitCodes: [0],
      },
      "stdin prompt"
    );

    expect(command.args).toEqual(["-p"]);
    expect(command.stdin).toBe("stdin prompt");
  });

  it("splices the model flag when a model is requested and modelFlag is configured", () => {
    const command = buildCommand(
      {
        command: "claude",
        args: ["-p", "{prompt}", "--output-format", "json"],
        promptPlaceholder: "{prompt}",
        passPromptViaStdin: false,
        successExitCodes: [0],
        modelFlag: ["--model", "{model}"],
      },
      "hello",
      { model: "opus" }
    );

    expect(command.args).toEqual(["-p", "hello", "--output-format", "json", "--model", "opus"]);
  });

  it("leaves args unchanged when a model is requested but no modelFlag is configured", () => {
    const command = buildCommand(
      {
        command: "gemini",
        args: ["-p", "{prompt}"],
        promptPlaceholder: "{prompt}",
        passPromptViaStdin: false,
        successExitCodes: [0],
      },
      "hello",
      { model: "gemini-pro" }
    );

    expect(command.args).toEqual(["-p", "hello"]);
  });

  it("leaves args unchanged when modelFlag is configured but no model is requested", () => {
    const command = buildCommand(
      {
        command: "claude",
        args: ["-p", "{prompt}"],
        promptPlaceholder: "{prompt}",
        passPromptViaStdin: false,
        successExitCodes: [0],
        modelFlag: ["--model", "{model}"],
      },
      "hello"
    );

    expect(command.args).toEqual(["-p", "hello"]);
  });
});
