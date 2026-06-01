import { afterEach, describe, expect, it } from "vitest";

import { getQAConfig } from "../../src/config/qa-config.js";

const ENV_KEYS = [
  "AUTO_QA",
  "QA_ENABLED",
  "QA_HALT_ON_CRITICAL",
  "QA_SELF_REVIEW",
  "QA_AUTOMATED_CHECKS",
  "QA_MIN_QUALITY_SCORE",
  "QA_AGENT_SELECTION",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("getQAConfig", () => {
  it("uses defaults", () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    const config = getQAConfig();
    expect(config.enabled).toBe(true);
    expect(config.haltOnCritical).toBe(true);
    expect(config.selfReview).toBe(true);
    expect(config.automatedChecks).toBe(true);
    expect(config.minQualityScore).toBe(7);
    expect(config.agentSelection).toBe("auto");
  });

  it("honors environment overrides and clamps min score", () => {
    process.env.QA_ENABLED = "false";
    process.env.QA_HALT_ON_CRITICAL = "false";
    process.env.QA_SELF_REVIEW = "false";
    process.env.QA_AUTOMATED_CHECKS = "false";
    process.env.QA_MIN_QUALITY_SCORE = "42";
    process.env.QA_AGENT_SELECTION = "codex";

    const config = getQAConfig();
    expect(config.enabled).toBe(false);
    expect(config.haltOnCritical).toBe(false);
    expect(config.selfReview).toBe(false);
    expect(config.automatedChecks).toBe(false);
    expect(config.minQualityScore).toBe(10);
    expect(config.agentSelection).toBe("codex");
  });
});
