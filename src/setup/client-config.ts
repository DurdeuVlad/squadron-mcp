export interface McpClientConfigOptions {
  command?: string;
  args?: string[];
  serverName?: string;
}

export interface McpClientConfigSnippet {
  mcpServers: Record<string, { command: string; args: string[] }>;
}

/**
 * Single source of truth for the mcpServers JSON block users add to their
 * MCP client config (e.g. ~/.config/claude/mcp.json). Built from the real
 * installed package/bin/server names so this can't drift the way the old
 * hand-copied README snippet did across the rename.
 */
export function generateMcpClientConfigSnippet(
  options: McpClientConfigOptions = {}
): McpClientConfigSnippet {
  const { command = "npx", args = ["squadron-mcp"], serverName = "squadron" } = options;

  return {
    mcpServers: {
      [serverName]: { command, args },
    },
  };
}
