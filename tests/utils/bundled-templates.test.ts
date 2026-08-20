import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { getBundledTemplatesDir, scaffoldBuiltinTemplates } from "../../src/utils/bundled-templates.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("bundled-templates", () => {
  it("resolves a real, existing bundled templates directory", () => {
    const dir = getBundledTemplatesDir();
    expect(dir.endsWith("templates")).toBe(true);
  });

  it("copies all built-in templates into a fresh target directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "squadron-templates-"));
    tempDirs.push(dir);

    const copied = scaffoldBuiltinTemplates(dir);

    expect(copied.length).toBeGreaterThan(0);
    expect(copied).toContain("typescript-feature.json");
    const content = JSON.parse(readFileSync(join(dir, "typescript-feature.json"), "utf8"));
    expect(content.name).toBe("typescript-feature");
  });

  it("does not overwrite a file the user already customized", () => {
    const dir = mkdtempSync(join(tmpdir(), "squadron-templates-"));
    tempDirs.push(dir);
    writeFileSync(join(dir, "typescript-feature.json"), '{"custom":true}', "utf8");

    const copied = scaffoldBuiltinTemplates(dir);

    expect(copied).not.toContain("typescript-feature.json");
    const content = JSON.parse(readFileSync(join(dir, "typescript-feature.json"), "utf8"));
    expect(content).toEqual({ custom: true });
  });

  it("is a no-op on a second call once everything is already copied", () => {
    const dir = mkdtempSync(join(tmpdir(), "squadron-templates-"));
    tempDirs.push(dir);

    scaffoldBuiltinTemplates(dir);
    const secondCall = scaffoldBuiltinTemplates(dir);

    expect(secondCall).toEqual([]);
  });
});
