import { describe, it, expect, vi, beforeEach } from "vitest";
import { InteractiveTerminalSessionImpl } from "../../src/execution/interactive-session";
import type { SpawnedTerminal } from "../../src/execution/windows-spawner";
import { EventEmitter } from "node:events";

describe("InteractiveTerminalSession", () => {
  let mockSpawner: any;
  let mockProcess: any;

  beforeEach(() => {
    mockProcess = new EventEmitter();
    mockProcess.pid = 1234;
    mockProcess.stdin = { write: vi.fn() };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();

    mockSpawner = {
      spawn: vi.fn().mockReturnValue({
        pid: 1234,
        process: mockProcess,
      }),
    };
  });

  it("should initialize session successfully", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    expect(session.status).toBe("initializing");

    // Simulate prompt ready
    setTimeout(() => {
      mockProcess.stdout.emit("data", Buffer.from("> "));
    }, 100);

    await session.initialize();

    expect(session.status).toBe("ready");
    expect(mockSpawner.spawn).toHaveBeenCalledWith({
      command: "claude",
      args: undefined,
      shell: "cmd",
      visible: true,
    });
  });

  it("should send prompt and receive response", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    // Initialize
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    // Send prompt
    const promptPromise = session.sendPrompt("Hello");

    // Simulate response
    setTimeout(() => {
      mockProcess.stdout.emit("data", Buffer.from("Response text\n"));
      mockProcess.stdout.emit("data", Buffer.from("> "));
    }, 100);

    const response = await promptPromise;

    expect(response.success).toBe(true);
    expect(response.output).toContain("Response text");
    expect(mockProcess.stdin.write).toHaveBeenCalledWith("Hello\n");
  });

  it("should track task count", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    expect(session.taskCount).toBe(0);

    // Task 1
    const promise1 = session.sendPrompt("Task 1");
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await promise1;

    expect(session.taskCount).toBe(1);

    // Task 2
    const promise2 = session.sendPrompt("Task 2");
    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await promise2;

    expect(session.taskCount).toBe(2);
  });

  it("should close session", async () => {
    const session = new InteractiveTerminalSessionImpl(
      {
        agent: "claude",
        command: "claude",
        shell: "cmd",
        completionMarker: "> ",
        completionTimeoutMs: 10000,
      },
      mockSpawner
    );

    setTimeout(() => mockProcess.stdout.emit("data", Buffer.from("> ")), 50);
    await session.initialize();

    await session.close();

    expect(session.status).toBe("closed");
    expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
