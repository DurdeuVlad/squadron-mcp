import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface SpawnConfig {
  command: string;
  args?: string[];
  shell: "cmd" | "powershell";
  visible: boolean;
  cwd?: string;
  env?: Record<string, string>;
}

export interface SpawnedTerminal {
  pid: number;
  process: ChildProcessWithoutNullStreams;
}

export class WindowsTerminalSpawner {
  spawn(config: SpawnConfig): SpawnedTerminal {
    // For visible cmd.exe window with interactive command
    // Use: cmd.exe /K "command"
    // /K = keep window open after command
    
    const spawnCommand = config.shell === "cmd" ? "cmd.exe" : "powershell.exe";
    const spawnArgs = config.shell === "cmd"
      ? ["/K", config.command, ...(config.args ?? [])]
      : ["-NoExit", "-Command", config.command, ...(config.args ?? [])];

    const child = spawn(spawnCommand, spawnArgs, {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: !config.visible,  // visible = false means windowsHide = true
      detached: false,
    });

    if (!child.pid) {
      throw new Error("Failed to spawn terminal: no PID");
    }

    return {
      pid: child.pid,
      process: child,
    };
  }
}
