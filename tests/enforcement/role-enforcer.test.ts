import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../../src/config/types.js";
import { RoleEnforcer } from "../../src/enforcement/role-enforcer.js";

describe("RoleEnforcer", () => {
  it("checks capabilities", () => {
    const enforcer = new RoleEnforcer(DEFAULT_CONFIG);
    expect(enforcer.checkCapability("claude", "planning")).toBe(true);
    expect(enforcer.checkCapability("gemini", "planning")).toBe(false);
  });

  it("enforces delegation boundaries", () => {
    const enforcer = new RoleEnforcer(DEFAULT_CONFIG);
    expect(() =>
      enforcer.enforceTaskDelegation("gemini", "claude", "bad delegation")
    ).toThrow();
  });

  it("allows valid planner -> executor delegation", () => {
    const enforcer = new RoleEnforcer(DEFAULT_CONFIG);
    expect(() =>
      enforcer.enforceTaskDelegation("claude", "gemini", "valid delegation")
    ).not.toThrow();
  });

  it("suggests code reading delegation for large files", () => {
    const enforcer = new RoleEnforcer(DEFAULT_CONFIG);
    expect(enforcer.shouldDelegateCodeReading("claude", 300)).toBe(true);
    expect(enforcer.shouldDelegateCodeReading("gemini", 300)).toBe(false);
    expect(enforcer.shouldDelegateCodeReading("claude", 50)).toBe(false);
  });

  it("throws for unknown agents", () => {
    const enforcer = new RoleEnforcer(DEFAULT_CONFIG);
    expect(() => enforcer.checkCapability("unknown", "planning")).toThrow("Unknown agent");
  });

  it("allows all checks when enforcement disabled", () => {
    const enforcer = new RoleEnforcer({
      ...DEFAULT_CONFIG,
      roleBoundaries: {
        ...DEFAULT_CONFIG.roleBoundaries!,
        enforce: false,
      },
    });
    expect(enforcer.checkCapability("gemini", "planning")).toBe(true);
    expect(enforcer.shouldDelegateCodeReading("claude", 999)).toBe(false);
  });
});
