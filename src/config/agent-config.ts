export type AgentType = "claude" | "gemini" | "codex";
export type AgentRole = "planner" | "executor" | "reviewer";
export type AuthMethod = "global-cli" | "subscription" | "api-key";

export interface AgentCredits {
  agent: AgentType;
  available: boolean;
  creditsRemaining: number;
  usageToday: number;
  lastChecked: Date;
  exhaustedAt?: Date;
}

export interface AgentConfig {
  name: AgentType;
  roles: AgentRole[];
  authMethod: AuthMethod;
  fallbacks: AgentType[];
  priority: number;
}

export interface AgentSelectionResult {
  agent: AgentType;
  fallbackUsed: boolean;
  reason?: string;
  creditsAvailable: boolean;
}

const DEFAULT_DAILY_LIMITS: Record<AgentType, number> = {
  claude: 1_000_000,
  gemini: 2_000_000,
  codex: 500_000,
};

export class AgentManager {
  private readonly credits = new Map<AgentType, AgentCredits>();
  private readonly configs = new Map<AgentType, AgentConfig>();
  private yoloMode = true;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.configs.set("claude", {
      name: "claude",
      roles: ["planner", "reviewer"],
      authMethod: "api-key",
      fallbacks: ["codex"],
      priority: 1,
    });

    this.configs.set("gemini", {
      name: "gemini",
      roles: ["executor"],
      authMethod: "api-key",
      fallbacks: ["codex"],
      priority: 2,
    });

    this.configs.set("codex", {
      name: "codex",
      roles: ["planner", "executor", "reviewer"],
      authMethod: "api-key",
      fallbacks: [],
      priority: 3,
    });

    for (const agent of Object.keys(DEFAULT_DAILY_LIMITS) as AgentType[]) {
      this.credits.set(agent, {
        agent,
        available: true,
        creditsRemaining: DEFAULT_DAILY_LIMITS[agent],
        usageToday: 0,
        lastChecked: new Date(),
      });
    }
  }

  async selectAgent(
    role: AgentRole,
    preferredAgent?: AgentType,
    estimatedTokens = 0
  ): Promise<AgentSelectionResult> {
    if (preferredAgent) {
      const preferred = this.trySelect(preferredAgent, estimatedTokens);
      if (preferred) {
        return preferred;
      }

      const fallbackCandidates = this.configs.get(preferredAgent)?.fallbacks ?? [];
      for (const fallback of fallbackCandidates) {
        const fallbackSelection = this.trySelect(fallback, estimatedTokens, true, preferredAgent);
        if (fallbackSelection) {
          return fallbackSelection;
        }
      }
    }

    const candidates = [...this.configs.values()]
      .filter((config) => config.roles.includes(role))
      .sort((a, b) => a.priority - b.priority);

    for (const candidate of candidates) {
      const selection = this.trySelect(candidate.name, estimatedTokens);
      if (selection) {
        return selection;
      }
    }

    throw new Error(`No available agents for role: ${role}`);
  }

  async trackUsage(agent: AgentType, tokensUsed: number): Promise<void> {
    const current = this.credits.get(agent);
    if (!current) {
      return;
    }

    current.usageToday += tokensUsed;
    current.creditsRemaining -= tokensUsed;
    current.lastChecked = new Date();

    if (current.creditsRemaining <= 0) {
      current.available = false;
      current.exhaustedAt = new Date();
    }
  }

  getCreditStatus(): Record<AgentType, AgentCredits> {
    return {
      claude: this.credits.get("claude") as AgentCredits,
      gemini: this.credits.get("gemini") as AgentCredits,
      codex: this.credits.get("codex") as AgentCredits,
    };
  }

  setYoloMode(enabled: boolean): void {
    this.yoloMode = enabled;
  }

  getYoloMode(): boolean {
    return this.yoloMode;
  }

  private trySelect(
    agent: AgentType,
    estimatedTokens: number,
    fallbackUsed = false,
    preferredAgent?: AgentType
  ): AgentSelectionResult | null {
    const status = this.credits.get(agent);
    if (!status || !status.available || status.creditsRemaining < estimatedTokens) {
      return null;
    }

    return {
      agent,
      fallbackUsed,
      reason: fallbackUsed && preferredAgent ? `${preferredAgent} unavailable` : undefined,
      creditsAvailable: true,
    };
  }
}

export const agentManager = new AgentManager();
