import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ZodType, ZodTypeDef } from "zod";

export interface ToolInputSchema {
  [key: string]: unknown;
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
}

export interface ToolDefinition<TInput extends object, TOutput extends object> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  schema: ZodType<TInput, ZodTypeDef, unknown>;
  handler: (input: TInput) => Promise<TOutput> | TOutput;
}

export interface WrappedTool<TOutput extends object> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute: (input: unknown) => Promise<TOutput>;
}

export function toMcpToolDefinition(definition: {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}): Tool {
  return {
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
  };
}
