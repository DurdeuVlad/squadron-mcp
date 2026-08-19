import { PromptRegistry } from "./registry.js";
import { planDelegationPrompt } from "./plan-delegation.js";
import { reviewReportPrompt } from "./review-report.js";
import { trackWorkflowStatusPrompt } from "./track-workflow-status.js";
import { optimizeTokensPrompt } from "./optimize-tokens.js";
import type { OrchestratorServices } from "../tools/registry.js";

// services is accepted (not currently used by any built-in prompt) so plugin-contributed
// prompts registered alongside these can depend on it without changing this signature.
export function createDefaultPromptRegistry(_services?: OrchestratorServices): PromptRegistry {
  return new PromptRegistry([
    planDelegationPrompt,
    reviewReportPrompt,
    trackWorkflowStatusPrompt,
    optimizeTokensPrompt,
  ]);
}
