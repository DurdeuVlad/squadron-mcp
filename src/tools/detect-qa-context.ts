import { extname, basename, dirname } from "node:path";

import { QA_PERSPECTIVES } from "../config/qa-perspectives.js";
import { QA_PROMPTS } from "../config/qa-prompts.js";

export interface QAContext {
  category: "code" | "documentation" | "configuration" | "tests" | "database" | "other";
  subCategory?: string;
  fileExtension: string;
  filePath: string;
  language?: string;
  framework?: string;
  selectedPrompts: string[];
  automatedChecks: string[];
  perspective?: string;
  additionalPrompts: string[];
}

export interface DetectQAContextInput {
  filePath?: string;
  fileContent?: string;
  workflowPerspective?: string;
  taskDescription?: string;
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function detectLanguage(ext: string): string | undefined {
  const map: Record<string, string> = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".kt": "kotlin",
    ".swift": "swift",
    ".dart": "dart",
    ".sh": "shell",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".tf": "terraform",
  };
  return map[ext];
}

function detectFramework(content: string, language?: string): string | undefined {
  const lower = content.toLowerCase();
  if (language === "typescript" || language === "javascript") {
    if (lower.includes("react")) return "react";
    if (lower.includes("express")) return "express";
    if (lower.includes("fastify")) return "fastify";
    if (lower.includes("next")) return "nextjs";
    if (lower.includes("@nestjs")) return "nestjs";
    if (lower.includes("vue")) return "vue";
    if (lower.includes("@angular")) return "angular";
  }
  if (language === "python") {
    if (lower.includes("fastapi")) return "fastapi";
    if (lower.includes("django")) return "django";
    if (lower.includes("flask")) return "flask";
  }
  return undefined;
}

function detectDocType(fileBase: string, content: string): string {
  if (fileBase.includes("readme")) return "readme";
  if (fileBase.includes("api") || content.includes("# api")) return "api-docs";
  return "technical-guide";
}

function detectTestType(taskDescription: string, folder: string): string {
  if (folder.includes("integration") || taskDescription.toLowerCase().includes("integration")) {
    return "integration";
  }
  return "unit";
}

function selectPromptSet(category: QAContext["category"], subCategory?: string) {
  if (category === "other") {
    return { prompts: [], automatedChecks: [] as string[] };
  }

  const categoryPrompts = QA_PROMPTS[category];
  if (!categoryPrompts) {
    return { prompts: [], automatedChecks: [] as string[] };
  }

  const matched = subCategory ? categoryPrompts[subCategory] : undefined;
  if (matched) {
    return {
      prompts: matched.prompts,
      automatedChecks: matched.automatedChecks ?? [],
    };
  }

  const fallback = (categoryPrompts as Record<string, { prompts: string[]; automatedChecks?: string[] }>).general;
  if (fallback) {
    return {
      prompts: fallback.prompts,
      automatedChecks: fallback.automatedChecks ?? [],
    };
  }

  return { prompts: [], automatedChecks: [] as string[] };
}

export function detectQAContext(input: DetectQAContextInput): QAContext {
  const filePath = input.filePath ?? "";
  const normalizedPath = normalize(filePath);
  const ext = extname(normalizedPath);
  const fileBase = basename(normalizedPath);
  const folder = normalize(dirname(normalizedPath));
  const content = (input.fileContent ?? "").toLowerCase();

  let category: QAContext["category"] = "other";
  let subCategory: string | undefined;
  let language: string | undefined;

  if (
    [
      ".py",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".java",
      ".go",
      ".rs",
      ".cs",
      ".rb",
      ".php",
      ".kt",
      ".swift",
      ".dart",
      ".sh",
      ".sql",
      ".graphql",
      ".gql",
      ".tf",
    ].includes(ext)
  ) {
    category = "code";
    language = detectLanguage(ext);
    const framework = detectFramework(input.fileContent ?? "", language);
    subCategory = framework ?? language ?? "general";
  } else if ([".md", ".txt", ".rst", ".adoc"].includes(ext) || fileBase.includes("readme")) {
    category = "documentation";
    subCategory = detectDocType(fileBase, content);
  } else if (
    [".json", ".yaml", ".yml", ".env", ".toml", ".ini", ".conf"].includes(ext) ||
    fileBase.includes("dockerfile") ||
    fileBase.includes("package.json") ||
    fileBase.includes("tsconfig")
  ) {
    category = "configuration";
    if (ext === ".yaml" || ext === ".yml") subCategory = "yaml";
    else if (ext === ".env") subCategory = "env";
    else if (fileBase.includes("dockerfile")) subCategory = "dockerfile";
    else if (fileBase.includes("package")) subCategory = "package-json";
    else if (fileBase.includes("tsconfig")) subCategory = "tsconfig";
    else subCategory = ext.replace(".", "") || "json";
  } else if (
    fileBase.includes("test") ||
    fileBase.includes("spec") ||
    folder.includes("test") ||
    folder.includes("spec")
  ) {
    category = "tests";
    subCategory = detectTestType(input.taskDescription ?? "", folder);
  } else if (folder.includes("migration") || folder.includes("schema") || folder.includes("database")) {
    category = "database";
    if (folder.includes("migration")) subCategory = "migration";
    else if (folder.includes("seed")) subCategory = "seed";
    else if (folder.includes("backup")) subCategory = "backup";
    else if (folder.includes("index")) subCategory = "indexes";
    else subCategory = "schema";
  }

  const promptSet = selectPromptSet(category, subCategory);
  const perspective = input.workflowPerspective?.toLowerCase();
  const overlay = perspective ? QA_PERSPECTIVES[perspective] : undefined;

  return {
    category,
    subCategory,
    fileExtension: ext,
    filePath,
    language,
    framework: detectFramework(input.fileContent ?? "", language),
    selectedPrompts: promptSet.prompts,
    automatedChecks: promptSet.automatedChecks,
    perspective,
    additionalPrompts: overlay?.additionalPrompts ?? [],
  };
}
