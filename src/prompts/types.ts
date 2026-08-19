import type { GetPromptResult, Prompt, PromptArgument } from "@modelcontextprotocol/sdk/types.js";

export interface PromptDefinition {
  name: string;
  title?: string;
  description: string;
  arguments?: PromptArgument[];
  build: (args: Record<string, string> | undefined) => GetPromptResult | Promise<GetPromptResult>;
}

export function toMcpPromptDefinition(definition: PromptDefinition): Prompt {
  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    arguments: definition.arguments,
  };
}
