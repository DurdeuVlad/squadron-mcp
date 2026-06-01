import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

import type { AgentExecutionRequest, AgentExecutionResult, AgentRunner, ExecutionStatus } from "./types.js";

type SpawnFn = typeof spawn;

function isWindowsCmdScript(command: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  const lowered = command.toLowerCase();
  return lowered.endsWith(".cmd") || lowered.endsWith(".bat");
}

function quoteForCmd(value: string): string {
  if (value.length === 0) {
    return "\"\"";
  }
  if (!/[ \t"]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/gu, "\\\"")}"`;
}

function terminateChild(child: ChildProcessWithoutNullStreams): void {
  if (process.platform === "win32" && typeof child.pid === "number" && child.pid > 0) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }, 2_000).unref();
}

function appendOutput(current: string, chunk: string, limit: number): string {
  if (limit <= 0) {
    return current;
  }

  const merged = current + chunk;
  if (merged.length <= limit) {
    return merged;
  }

  const ellipsis = "\n...[truncated]";
  const keep = Math.max(0, limit - ellipsis.length);
  return `${merged.slice(0, keep)}${ellipsis}`;
}

export class ProcessAgentRunner implements AgentRunner {
  private readonly spawnFn: SpawnFn;

  constructor(spawnFn: SpawnFn = spawn) {
    this.spawnFn = spawnFn;
  }

  async run(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();

    let child: ChildProcessWithoutNullStreams;
    try {
      let spawnCommand = request.command.command;
      let spawnArgs = request.command.args;
      if (isWindowsCmdScript(request.command.command)) {
        const comspec = process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe";
        const commandLine = [quoteForCmd(request.command.command), ...request.command.args.map(quoteForCmd)].join(
          " "
        );
        spawnCommand = comspec;
        spawnArgs = ["/d", "/s", "/c", commandLine];
      }

      child = this.spawnFn(spawnCommand, spawnArgs, {
        cwd: request.command.cwd,
        env: {
          ...process.env,
          ...(request.command.env ?? {}),
        },
        stdio: "pipe",
        windowsHide: true,
      });
    } catch (error) {
      const ended = Date.now();
      return {
        agent: request.agent,
        status: "failed",
        exitCode: null,
        signal: null,
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        stdout: "",
        stderr: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateChild(child);
    }, request.timeoutMs);

    const finish = (
      status: ExecutionStatus,
      exitCode: number | null,
      signal: NodeJS.Signals | null,
      error?: string
    ): AgentExecutionResult => {
      const ended = Date.now();
      return {
        agent: request.agent,
        status,
        exitCode,
        signal,
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        stdout,
        stderr,
        error,
      };
    };

    return await new Promise<AgentExecutionResult>((resolve) => {
      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout = appendOutput(stdout, String(chunk), request.maxOutputBytes);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr = appendOutput(stderr, String(chunk), request.maxOutputBytes);
      });

      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(finish("failed", null, null, error.message));
      });

      child.on("close", (exitCode, signal) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);

        if (timedOut) {
          resolve(finish("timed_out", exitCode, signal, "Process timed out."));
          return;
        }

        const successCodes = request.command.successExitCodes;
        const status: ExecutionStatus =
          exitCode !== null && successCodes.includes(exitCode) ? "completed" : "failed";
        resolve(finish(status, exitCode, signal));
      });

      if (request.command.stdin) {
        child.stdin.write(request.command.stdin);
      }
      child.stdin.end();
    });
  }
}
