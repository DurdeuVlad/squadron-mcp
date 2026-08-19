import { z } from "zod";

export const plugin = {
  name: "valid-test-plugin",
  version: "0.0.1",
  registerTools(registry) {
    registry.register({
      name: "fixture_tool",
      description: "A tool registered by the valid test fixture plugin.",
      inputSchema: { type: "object", properties: {} },
      schema: z.object({}),
      handler: async () => ({ ok: true }),
    });
  },
};

export default plugin;
