import { z } from "zod";

import type { ToolDefinition } from "./types.js";

export interface PingInput {
  message?: string;
}

export interface PingResult {
  response: "pong";
  echo: string;
  timestamp: string;
}

const pingSchema = z.object({
  message: z.string().optional(),
});

export const pingTool: ToolDefinition<PingInput, PingResult> = {
  name: "ping",
  description: "Connectivity test tool that responds with pong.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Optional message that will be echoed back.",
      },
    },
  },
  schema: pingSchema,
  handler: async (input: PingInput): Promise<PingResult> => ({
    response: "pong",
    echo: input.message ?? "no message",
    timestamp: new Date().toISOString(),
  }),
};
