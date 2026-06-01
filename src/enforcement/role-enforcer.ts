import type { AgentRole, OrchestratorConfig } from "../config/types.js";

export class RoleEnforcer {
  private readonly config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  checkCapability(agent: string, capability: string): boolean {
    if (!this.config.roleBoundaries?.enforce) {
      return true;
    }

    const agentConfig = this.config.agents[agent];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agent}`);
    }

    return agentConfig.capabilities.includes(capability);
  }

  getAgentRole(agent: string): AgentRole {
    const agentConfig = this.config.agents[agent];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agent}`);
    }
    return agentConfig.role;
  }

  enforceTaskDelegation(planner: string, executor: string, taskName: string): void {
    if (!this.config.roleBoundaries?.enforce) {
      return;
    }

    if (!this.checkCapability(planner, "planning")) {
      throw new Error(`Agent ${planner} does not have planning capability`);
    }

    if (!this.checkCapability(executor, "execution")) {
      throw new Error(`Agent ${executor} does not have execution capability`);
    }

    const plannerRole = this.getAgentRole(planner);
    const executorRole = this.getAgentRole(executor);

    if (plannerRole === "executor") {
      throw new Error(`Agent ${planner} is an executor and cannot plan task "${taskName}"`);
    }

    if (executorRole === "planner") {
      throw new Error(`Agent ${executor} is a planner and cannot execute task "${taskName}"`);
    }
  }

  shouldDelegateCodeReading(agent: string, fileSizeLines: number): boolean {
    if (!this.config.roleBoundaries?.enforce) {
      return false;
    }

    const role = this.getAgentRole(agent);
    const threshold = this.config.roleBoundaries.maxPlannerFileLines;
    return role === "planner" && fileSizeLines > threshold;
  }
}
