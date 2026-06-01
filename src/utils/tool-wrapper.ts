import { ZodError } from "zod";

import { log } from "./logger.js";
import type { ToolDefinition, WrappedTool } from "../tools/types.js";

function formatErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ");
  }

  return error instanceof Error ? error.message : "Unknown tool error.";
}

export function wrapTool<TInput extends object, TOutput extends object>(
  tool: ToolDefinition<TInput, TOutput>
): WrappedTool<TOutput> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: async (input: unknown): Promise<TOutput> => {
      try {
        const validatedInput = tool.schema.parse(input ?? {});
        log("info", "tool.invoked", { tool: tool.name });

        const result = await tool.handler(validatedInput);
        log("info", "tool.completed", { tool: tool.name });
        return result;
      } catch (error) {
        const message = formatErrorMessage(error);
        log("error", "tool.failed", { tool: tool.name, error: message });
        throw new Error(message);
      }
    },
  };
}
