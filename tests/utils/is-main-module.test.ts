import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { isMainModule } from "../../src/utils/is-main-module.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeRealFile(): { dir: string; realFile: string } {
  const dir = mkdtempSync(join(tmpdir(), "is-main-module-"));
  tempDirs.push(dir);
  const realFile = join(dir, "entry.js");
  writeFileSync(realFile, "// stub\n", "utf8");
  return { dir, realFile };
}

describe("isMainModule", () => {
  it("is true when argv1 is exactly the module's own file", () => {
    const { realFile } = makeRealFile();
    expect(isMainModule(pathToFileURL(realFile).href, realFile)).toBe(true);
  });

  it("is true when argv1 is a symlink pointing at the module's file (the npm bin-shim case)", () => {
    const { dir, realFile } = makeRealFile();
    const shimPath = join(dir, "squadron");
    symlinkSync(realFile, shimPath);

    // This is exactly what node_modules/.bin/squadron -> dist/cli.js looks
    // like at runtime: argv[1] is the shim path, import.meta.url resolves to
    // the real target. A naive `argv[1] === script path` check fails here.
    expect(isMainModule(pathToFileURL(realFile).href, shimPath)).toBe(true);
  });

  it("is false when argv1 points at a different file entirely", () => {
    const { dir, realFile } = makeRealFile();
    const otherFile = join(dir, "other.js");
    writeFileSync(otherFile, "// stub\n", "utf8");

    expect(isMainModule(pathToFileURL(realFile).href, otherFile)).toBe(false);
  });

  it("is false when argv1 is undefined (module imported as a library, not run directly)", () => {
    const { realFile } = makeRealFile();
    expect(isMainModule(pathToFileURL(realFile).href, undefined)).toBe(false);
  });

  it("is false when argv1 points at a path that doesn't exist", () => {
    const { dir, realFile } = makeRealFile();
    expect(isMainModule(pathToFileURL(realFile).href, join(dir, "does-not-exist.js"))).toBe(false);
  });
});
