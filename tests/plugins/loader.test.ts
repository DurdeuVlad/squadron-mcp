import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { log } from "../../src/utils/logger.js";
import { loadPlugins } from "../../src/plugins/loader.js";

vi.mock("../../src/utils/logger.js", () => ({
  log: vi.fn(),
}));

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/plugins");

describe("loadPlugins", () => {
  beforeEach(() => {
    vi.mocked(log).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a valid plugin", async () => {
    const loaded = await loadPlugins(["valid-plugin.js"], fixturesDir);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.plugin.name).toBe("valid-test-plugin");
  });

  it("skips a plugin that throws during import, without throwing itself", async () => {
    const loaded = await loadPlugins(["throwing-plugin.js"], fixturesDir);

    expect(loaded).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      "error",
      "plugin.load_failed",
      expect.objectContaining({ path: expect.stringContaining("throwing-plugin.js") })
    );
  });

  it("skips a plugin with a malformed export shape, without throwing", async () => {
    const loaded = await loadPlugins(["malformed-plugin.js"], fixturesDir);

    expect(loaded).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      "error",
      "plugin.invalid",
      expect.objectContaining({ path: expect.stringContaining("malformed-plugin.js") })
    );
  });

  it("loads only the valid plugin out of a mixed list, isolating the others' failures", async () => {
    const loaded = await loadPlugins(
      ["valid-plugin.js", "throwing-plugin.js", "malformed-plugin.js"],
      fixturesDir
    );

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.plugin.name).toBe("valid-test-plugin");
  });

  it("returns an empty array for an empty plugin list", async () => {
    const loaded = await loadPlugins([], fixturesDir);
    expect(loaded).toEqual([]);
  });
});
