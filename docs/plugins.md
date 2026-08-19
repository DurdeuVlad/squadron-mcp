# Plugins

Squadron supports a minimal plugin system: local JavaScript/TypeScript files that can register their own tools, prompts, and templates without forking the codebase.

The point isn't just adding new tool functions — a plugin can ship a matching [Prompt](prompts.md) alongside a new tool, so a client discovering the tool also gets usage guidance for it, the same pattern Squadron's own built-in tools/prompts follow.

## v1 scope

- **Local file paths only**, declared in your config's `plugins` array:
  ```json
  { "plugins": ["./my-plugin.js", "examples/plugins/hello-plugin.js"] }
  ```
  Paths resolve relative to the working directory the server starts in.
- Loaded once at startup, no hot-reload.
- **Error-isolated**: a plugin that fails to import, or whose export doesn't look like a valid plugin, is skipped with a logged warning (stderr — stdout is the MCP transport channel and must stay clean) rather than crashing the server. Within a single plugin, each hook (`registerTools`/`registerPrompts`/`registerTemplates`) is isolated too — one failing hook doesn't undo another that already succeeded, and doesn't block other plugins from loading.

**Explicitly out of scope for v1** (not built, may come later): npm-package plugin resolution (only local file paths work today), a plugin marketplace/registry, sandboxing beyond the try/catch isolation described above, and plugin/host version-compatibility checks.

## Writing a plugin

A plugin module exports a default (or named `plugin`) object matching this shape:

```ts
interface SquadronPlugin {
  name: string;
  version?: string;
  registerTools?(registry: ToolRegistry, services: OrchestratorServices): void | Promise<void>;
  registerPrompts?(registry: PromptRegistry, services: OrchestratorServices): void | Promise<void>;
  registerTemplates?(templateRegistry: TemplateRegistry, services: OrchestratorServices): void | Promise<void>;
}
```

All three hooks are optional — implement whichever your plugin needs. `registry.register(...)` on the tool/prompt registries takes the same shape as Squadron's own built-in tools (`src/tools/types.ts`'s `ToolDefinition`) and prompts (`src/prompts/types.ts`'s `PromptDefinition`).

See [`examples/plugins/hello-plugin.js`](../examples/plugins/hello-plugin.js) for a complete minimal example (one tool, one matching prompt).

## Example

```js
// my-plugin.js
export const plugin = {
  name: "my-plugin",
  registerTools(registry) {
    registry.register({
      name: "my_tool",
      description: "Does a thing.",
      inputSchema: { type: "object", properties: {} },
      schema: myZodSchema,
      handler: async (input) => ({ result: "..." }),
    });
  },
  registerPrompts(registry) {
    registry.register({
      name: "my_tool_usage",
      description: "How to use my_tool.",
      build: () => ({
        messages: [{ role: "user", content: { type: "text", text: "Call `my_tool` with ..." } }],
      }),
    });
  },
};
export default plugin;
```
