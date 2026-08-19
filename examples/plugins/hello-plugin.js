import { z } from "zod";

// Minimal reference Squadron plugin. Registers one tool and a matching
// prompt that teaches a client how to use it - the same pattern Squadron's
// own built-in tools/prompts follow. See docs/plugins.md.
//
// Point a config's `plugins` array at this file's path (relative to the
// working directory the server starts in) to load it:
//   { "plugins": ["examples/plugins/hello-plugin.js"] }

const helloSchema = z.object({
  name: z.string().optional(),
});

const helloTool = {
  name: "hello",
  description: "Example plugin tool: greets whoever you tell it to.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Who to greet." },
    },
  },
  schema: helloSchema,
  handler: async (input) => ({
    greeting: `Hello, ${input.name ?? "world"}! (from the hello-plugin example)`,
    timestamp: new Date().toISOString(),
  }),
};

const helloPrompt = {
  name: "hello_greeting",
  title: "Greet someone via the example plugin",
  description: "Teaches a client how to call the hello-plugin's `hello` tool.",
  arguments: [{ name: "name", description: "Who to greet", required: false }],
  build: (args) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Call the \`hello\` tool with { "name": "${args?.name ?? "world"}" } to get a greeting.`,
        },
      },
    ],
  }),
};

export const plugin = {
  name: "hello-plugin",
  version: "1.0.0",
  registerTools(registry) {
    registry.register(helloTool);
  },
  registerPrompts(registry) {
    registry.register(helloPrompt);
  },
};

export default plugin;
