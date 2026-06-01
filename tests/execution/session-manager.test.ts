import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalSessionManager } from "../../src/execution/session-manager.js";

// We mock the entire module to control what InteractiveTerminalSessionImpl returns
vi.mock("../../src/execution/interactive-session.js", () => {
  return {
    InteractiveTerminalSessionImpl: class {
      sessionId = `test-session-${Math.random()}`;
      agent = "claude";
      status = "ready";
      createdAt = new Date();
      lastUsedAt = new Date();
      taskCount = 0;
      initialize = vi.fn().mockResolvedValue(undefined);
      sendPrompt = vi.fn().mockResolvedValue({ success: true, output: "mock output" });
      healthCheck = vi.fn().mockResolvedValue(true);
      restart = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      on = vi.fn();
      off = vi.fn();
      emit = vi.fn();
    }
  };
});

describe("TerminalSessionManager", () => {
  const mockConfig = {
    sessionIdleTimeoutMs: 300000,
    sessionMaxAgeMs: 3600000,
    healthCheckIntervalMs: 30000,
    maxConsecutiveFailures: 3,
    agents: {
      claude: {
        command: "claude",
        shell: "cmd" as const,
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
    },
  };

  it("should create session on first request", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    const session = await manager.getOrCreateSession("claude");
    expect(session).toBeDefined();
    expect(session.agent).toBe("claude");
    await manager.closeAllSessions();
  });

  it("should reuse session for multiple requests", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    const session1 = await manager.getOrCreateSession("claude");
    const session2 = await manager.getOrCreateSession("claude");
    // Since we returned a class instance, it should be the SAME instance if cached
    expect(session1).toBe(session2);
    await manager.closeAllSessions();
  });

  it("should close all sessions on cleanup", async () => {
    const manager = new TerminalSessionManager(mockConfig);
    await manager.getOrCreateSession("claude");
    const sessions = manager.getSessions();
    expect(sessions.length).toBe(1);
    await manager.closeAllSessions();
    expect(manager.getSessions().length).toBe(0);
  });
});
