import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import { ProcessAgentRunner } from "../../src/execution/agent-runner.js";

class FakeChildProcess extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  stdin = new PassThrough();
  killed = false;

  kill(signal?: NodeJS.Signals): boolean {
    this.killed = true;
    this.emit("close", null, signal ?? "SIGTERM");
    return true;
  }
}

describe("ProcessAgentRunner", () => {
  it("returns completed for success exit codes", async () => {
    const child = new FakeChildProcess();
    const spawnFn = vi.fn(() => child as unknown as ReturnType<typeof import("node:child_process").spawn>);
    const runner = new ProcessAgentRunner(spawnFn as never);

    setTimeout(() => {
      child.stdout.write('{"summary":"ok"}');
      child.emit("close", 0, null);
    }, 0);

    const result = await runner.run({
      agent: "gemini",
      command: {
        command: "gemini",
        args: ["-p", "x"],
        successExitCodes: [0],
      },
      timeoutMs: 200,
      maxOutputBytes: 1000,
    });

    expect(result.status).toBe("completed");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("summary");
  });

  it("returns failed for non-zero exit code", async () => {
    const child = new FakeChildProcess();
    const spawnFn = vi.fn(() => child as unknown as ReturnType<typeof import("node:child_process").spawn>);
    const runner = new ProcessAgentRunner(spawnFn as never);

    setTimeout(() => {
      child.stderr.write("boom");
      child.emit("close", 2, null);
    }, 0);

    const result = await runner.run({
      agent: "claude",
      command: {
        command: "claude",
        args: ["-p", "x"],
        successExitCodes: [0],
      },
      timeoutMs: 200,
      maxOutputBytes: 1000,
    });

    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("boom");
  });

  it("returns timed_out when command exceeds timeout", async () => {
    const child = new FakeChildProcess();
    const spawnFn = vi.fn(() => child as unknown as ReturnType<typeof import("node:child_process").spawn>);
    const runner = new ProcessAgentRunner(spawnFn as never);

    const result = await runner.run({
      agent: "codex",
      command: {
        command: "codex",
        args: ["exec", "x"],
        successExitCodes: [0],
      },
      timeoutMs: 10,
      maxOutputBytes: 1000,
    });

    expect(result.status).toBe("timed_out");
    expect(child.killed).toBe(true);
  });
});
