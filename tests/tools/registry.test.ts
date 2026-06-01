import { describe, expect, it } from "vitest";

import { createDefaultToolRegistry, createOrchestratorServices } from "../../src/tools/registry.js";

describe("ToolRegistry", () => {
  it("lists all default tools", () => {
    const registry = createDefaultToolRegistry();
    const tools = registry.listTools();
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "ping",
        "create_task_spec",
        "delegate_task",
        "collect_report",
        "review_output",
        "track_workflow",
        "optimize_tokens",
        "classify_intent",
        "extract_workflow_params",
        "detect_context",
        "auto_orchestrate",
      ])
    );
  });

  it("invokes a registered tool", async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke("create_task_spec", {
      task: "Test task",
      inputs: {
        feature: "Test task",
        files: ["src/index.ts"],
      },
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.type).toBe("text");

    const parsed = JSON.parse(result.content[0]?.text ?? "{}") as {
      taskId?: string;
    };
    expect(typeof parsed.taskId).toBe("string");
  });

  it("returns isError for unknown tools", async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke("missing_tool", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Unknown tool");
  });

  it("returns isError for invalid arguments", async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke("delegate_task", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text.length).toBeGreaterThan(0);
  });

  it("throws when sqlite storage is requested", () => {
    expect(() =>
      createOrchestratorServices("templates", {
        agents: {
          claude: { role: "planner", capabilities: ["planning"] },
          gemini: { role: "executor", capabilities: ["execution"] },
          codex: { role: "reviewer", capabilities: ["review"] },
        },
        stateStorage: "sqlite",
      })
    ).toThrow("not implemented yet");
  });
});
