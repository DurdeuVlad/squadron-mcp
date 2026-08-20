import { describe, it, expect, vi, beforeEach } from "vitest";
import { delegateTaskTool } from "../../src/tools/delegate-task.js";
import { TerminalSessionManager } from "../../src/execution/session-manager.js";
import { DelegationRuntimeSchema, DEFAULT_CONFIG } from "../../src/config/types.js";

vi.mock("../../src/execution/session-manager.js", () => {
  return {
    TerminalSessionManager: vi.fn().mockImplementation(() => {
      return {
        execute: vi.fn().mockResolvedValue({
          agent: "gemini",
          status: "completed",
          exitCode: 0,
          signal: null,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: 100,
          stdout: '{"summary":"Task completed successfully","outputs":[],"issues":[],"recommendations":[],"metrics":{"tokensUsed":100}}',
          stderr: ""
        }),
        closeAllSessions: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe("Interactive Delegation Integration", () => {
  let mockStateManager: any;
  let mockRoleEnforcer: any;

  beforeEach(() => {
    mockStateManager = {
      getTask: vi.fn().mockReturnValue({
        spec: {
          id: "test-task",
          task: "Test interactive task",
          executor: "gemini",
          context: {},
          inputs: {},
          executionSteps: [],
          expectedOutputs: [],
          successCriteria: []
        }
      }),
      updateTaskStatus: vi.fn().mockReturnValue({ startTime: new Date().toISOString() }),
      attachTaskExecution: vi.fn(),
      attachTaskReport: vi.fn(),
      trackTaskTokenUsage: vi.fn(),
      getUnmetDependencies: vi.fn().mockReturnValue([])
    };

    mockRoleEnforcer = {
      enforceTaskDelegation: vi.fn()
    };
  });

  it("should use interactive strategy when configured", async () => {
    const runtime = DelegationRuntimeSchema.parse({
      ...DEFAULT_CONFIG.delegationRuntime,
      enabled: true,
      executionMode: "interactive",
      interactive: {
        enabled: true,
        visibleWindows: true,
        agents: {
          gemini: {
            command: "gemini",
            shell: "cmd",
            completionMarker: "> ",
            completionTimeoutMs: 10000
          }
        }
      }
    });

    const sessionManager = new TerminalSessionManager({} as any);
    const tool = delegateTaskTool({
      stateManager: mockStateManager,
      roleEnforcer: mockRoleEnforcer,
      delegationRuntime: runtime,
      sessionManager: sessionManager as any
    });

    const result = await tool.handler({
      taskId: "test-task",
      executor: "gemini",
      priority: "normal",
      planner: "claude"
    });

    expect(result.status).toBe("completed");
    expect(sessionManager.execute).toHaveBeenCalled();
    expect(mockStateManager.attachTaskReport).toHaveBeenCalled();
  });

  it("does not claim a model override was applied on a successful interactive attempt", async () => {
    const runtime = DelegationRuntimeSchema.parse({
      ...DEFAULT_CONFIG.delegationRuntime,
      enabled: true,
      executionMode: "interactive",
      interactive: {
        enabled: true,
        visibleWindows: true,
        agents: {
          gemini: {
            command: "gemini",
            shell: "cmd",
            completionMarker: "> ",
            completionTimeoutMs: 10000
          }
        }
      }
    });

    // Constructed directly rather than via `new TerminalSessionManager()`: the shared
    // vi.mock factory's implementation gets wiped by tests/setup.ts's global
    // `vi.restoreAllMocks()` after the first test in this file runs.
    const sessionManager = {
      execute: vi.fn().mockResolvedValue({
        agent: "gemini",
        status: "completed",
        exitCode: 0,
        signal: null,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 100,
        stdout: '{"summary":"Task completed successfully","outputs":[],"issues":[],"recommendations":[],"metrics":{"tokensUsed":100}}',
        stderr: ""
      }),
      closeAllSessions: vi.fn().mockResolvedValue(undefined)
    };
    const tool = delegateTaskTool({
      stateManager: mockStateManager,
      roleEnforcer: mockRoleEnforcer,
      delegationRuntime: runtime,
      sessionManager: sessionManager as any
    });

    const result = await tool.handler({
      taskId: "test-task",
      executor: "gemini",
      priority: "normal",
      planner: "claude",
      model: "requested-but-unsupported-here"
    });

    // sessionManager.execute has no model parameter -- interactive sessions can't
    // apply a per-call model override, so the result must not claim one was used.
    expect(sessionManager.execute).toHaveBeenCalledWith(
      "gemini",
      expect.any(String),
      expect.any(Object)
    );
    expect(result.execution?.model).toBeUndefined();
    expect(mockStateManager.attachTaskReport).toHaveBeenCalledWith(
      "test-task",
      expect.objectContaining({ model: undefined })
    );
  });
});
