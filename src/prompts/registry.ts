import type { GetPromptResult, Prompt } from "@modelcontextprotocol/sdk/types.js";

import { toMcpPromptDefinition, type PromptDefinition } from "./types.js";

export class PromptRegistry {
  private readonly prompts = new Map<string, PromptDefinition>();
  private readonly definitions = new Map<string, Prompt>();

  constructor(prompts: PromptDefinition[] = []) {
    for (const prompt of prompts) {
      this.register(prompt);
    }
  }

  register(prompt: PromptDefinition): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt already registered: ${prompt.name}`);
    }

    this.prompts.set(prompt.name, prompt);
    this.definitions.set(prompt.name, toMcpPromptDefinition(prompt));
  }

  listPrompts(): Prompt[] {
    return [...this.definitions.values()];
  }

  async get(name: string, args?: Record<string, string>): Promise<GetPromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    return prompt.build(args);
  }
}
