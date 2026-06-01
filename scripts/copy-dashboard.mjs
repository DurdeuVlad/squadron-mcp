import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sourceDir = join(process.cwd(), "src", "dashboard", "public");
const targetDir = join(process.cwd(), "dist", "dashboard", "public");
const sourceConfigDir = join(process.cwd(), "src", "config");
const targetConfigDir = join(process.cwd(), "dist", "config");

if (existsSync(sourceDir)) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

if (existsSync(sourceConfigDir)) {
  mkdirSync(targetConfigDir, { recursive: true });
  for (const file of readdirSync(sourceConfigDir)) {
    if (!file.endsWith(".json")) {
      continue;
    }

    cpSync(join(sourceConfigDir, file), join(targetConfigDir, file));
  }
}
