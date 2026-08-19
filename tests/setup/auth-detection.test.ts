import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import { existsSync } from "node:fs";
import { detectAgentAuth } from "../../src/setup/auth-detection.js";

const originalEnv = { ...process.env };

describe("detectAgentAuth", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports global-cli when a credential file exists on disk", () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).includes("anthropic"));

    const result = detectAgentAuth();

    expect(result.claude.method).toBe("global-cli");
    expect(result.claude.path).toContain("anthropic");
  });

  it("falls back to api-key when no credential file exists but the env var is set", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    const result = detectAgentAuth();

    expect(result.claude.method).toBe("api-key");
    expect(result.claude.path).toBeUndefined();
  });

  it("reports none when neither a credential file nor an env var is present", () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = detectAgentAuth();

    expect(result.claude.method).toBe("none");
    expect(result.gemini.method).toBe("none");
    expect(result.codex.method).toBe("none");
  });

  it("checks all three agents independently", () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).includes("google-ai"));

    const result = detectAgentAuth();

    expect(result.claude.method).toBe("none");
    expect(result.gemini.method).toBe("global-cli");
    expect(result.codex.method).toBe("none");
  });
});
