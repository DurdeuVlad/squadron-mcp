import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("../../src/setup/auth-detection.js", () => ({
  detectAgentAuth: vi.fn(() => ({
    claude: { method: "global-cli", path: "/fake/anthropic/config.json" },
    gemini: { method: "none" },
    codex: { method: "api-key" },
  })),
}));

import { confirm, text } from "@clack/prompts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { runInitWizard } from "../../src/setup/wizard.js";

describe("runInitWizard", () => {
  beforeEach(() => {
    vi.mocked(text).mockReset();
    vi.mocked(confirm).mockReset();
    vi.mocked(existsSync).mockReset().mockReturnValue(false);
    vi.mocked(mkdirSync).mockClear();
    vi.mocked(writeFileSync).mockClear();
  });

  it("writes config and directories, and skips the client-config snippet when declined", async () => {
    vi.mocked(text)
      .mockResolvedValueOnce("squadron-config.json")
      .mockResolvedValueOnce("templates");
    vi.mocked(confirm).mockResolvedValueOnce(false); // decline writing mcp-client-config.json

    const out: string[] = [];
    await runInitWizard(
      { config: "squadron-config.json", templatesDir: "templates", force: false },
      { out: (m) => out.push(m), err: () => {} }
    );

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenContent] = vi.mocked(writeFileSync).mock.calls[0] as [string, string];
    expect(writtenPath).toContain("squadron-config.json");
    expect(JSON.parse(writtenContent)).toMatchObject({ stateStorage: "file" });
    expect(mkdirSync).toHaveBeenCalledTimes(2);
    expect(out.some((line) => line.includes("Wrote config"))).toBe(true);
  });

  it("prompts before overwriting an existing config, and respects a decline", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(text)
      .mockResolvedValueOnce("squadron-config.json")
      .mockResolvedValueOnce("templates");
    vi.mocked(confirm)
      .mockResolvedValueOnce(false) // decline overwrite
      .mockResolvedValueOnce(false); // decline mcp-client-config.json

    const out: string[] = [];
    await runInitWizard(
      { config: "squadron-config.json", templatesDir: "templates", force: false },
      { out: (m) => out.push(m), err: () => {} }
    );

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(out.some((line) => line.includes("Kept existing config"))).toBe(true);
  });

  it("writes the mcp client config snippet when accepted", async () => {
    vi.mocked(text)
      .mockResolvedValueOnce("squadron-config.json")
      .mockResolvedValueOnce("templates");
    vi.mocked(confirm).mockResolvedValueOnce(true); // accept writing mcp-client-config.json

    await runInitWizard(
      { config: "squadron-config.json", templatesDir: "templates", force: false },
      { out: () => {}, err: () => {} }
    );

    expect(writeFileSync).toHaveBeenCalledTimes(2);
    const snippetCall = vi
      .mocked(writeFileSync)
      .mock.calls.find(([path]) => String(path).includes("mcp-client-config.json"));
    expect(snippetCall).toBeDefined();
    const written = JSON.parse(snippetCall![1] as string);
    expect(written).toEqual({ mcpServers: { squadron: { command: "npx", args: ["squadron-mcp"] } } });
  });
});
