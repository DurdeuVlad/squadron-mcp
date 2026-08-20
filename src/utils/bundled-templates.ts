import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Compiled to dist/utils/bundled-templates.js -- the package's own built-in
// templates ship at ../../templates from there, both in a dev build and once
// installed via npm.
const bundledTemplatesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");

export function getBundledTemplatesDir(): string {
  return bundledTemplatesDir;
}

/**
 * Copies the built-in template JSON files into `targetDir`, skipping any
 * file that already exists there so a user's customized copy is never
 * clobbered. Returns the names of the files actually copied.
 */
export function scaffoldBuiltinTemplates(targetDir: string): string[] {
  const copied: string[] = [];
  const entries = readdirSync(bundledTemplatesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const destPath = join(targetDir, entry.name);
    if (existsSync(destPath)) {
      continue;
    }
    copyFileSync(join(bundledTemplatesDir, entry.name), destPath);
    copied.push(entry.name);
  }
  return copied;
}
