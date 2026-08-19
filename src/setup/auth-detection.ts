import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AgentName = "claude" | "gemini" | "codex";
export type AuthMethod = "global-cli" | "api-key" | "none";

export interface AgentAuthStatus {
  method: AuthMethod;
  path?: string;
}

export type AuthDetectionResult = Record<AgentName, AgentAuthStatus>;

const AGENT_NAMES: AgentName[] = ["claude", "gemini", "codex"];

const API_KEY_ENV_VAR: Record<AgentName, string> = {
  claude: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_API_KEY",
  codex: "OPENAI_API_KEY",
};

// Paths documented in .env.example / docs/QUICK_START_GLOBAL_AUTH.md /
// docs/AUTHENTICATION.md - this is presence-checking against an
// already-specified list, not new detection logic.
function candidatePaths(agent: AgentName): string[] {
  const home = homedir();
  const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");

  switch (agent) {
    case "claude":
      return [
        join(appData, "anthropic", "config.json"),
        join(home, ".anthropic", "config.json"),
        join(home, ".config", "anthropic", "config.json"),
      ];
    case "gemini":
      return [
        join(appData, "google-ai", "credentials.json"),
        join(home, ".config", "google-ai", "credentials.json"),
      ];
    case "codex":
      return [join(appData, "openai", "config.json"), join(home, ".openai", "config.json")];
  }
}

/**
 * Minimal, real auth detection: fs.existsSync presence-checks against the
 * credential paths already documented for global CLI logins, falling back
 * to checking for the corresponding API key env var. No OAuth handshake,
 * no CLI invocation, no live session validation - just "does a plausible
 * credential exist".
 */
export function detectAgentAuth(): AuthDetectionResult {
  const result = {} as AuthDetectionResult;

  for (const agent of AGENT_NAMES) {
    const foundPath = candidatePaths(agent).find((path) => existsSync(path));
    if (foundPath) {
      result[agent] = { method: "global-cli", path: foundPath };
    } else if (process.env[API_KEY_ENV_VAR[agent]]) {
      result[agent] = { method: "api-key" };
    } else {
      result[agent] = { method: "none" };
    }
  }

  return result;
}
