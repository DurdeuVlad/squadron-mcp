import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Compiled to dist/utils/package-info.js -- the package root (containing
// package.json) is two levels up from there, both in a dev build and once
// installed via npm (package.json is always present alongside dist/).
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");

let cachedVersion: string | undefined;

export function getPackageVersion(): string {
  if (cachedVersion === undefined) {
    const raw = readFileSync(packageJsonPath, "utf8");
    cachedVersion = (JSON.parse(raw) as { version: string }).version;
  }
  return cachedVersion;
}
