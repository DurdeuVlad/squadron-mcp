import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { TemplateSchema, type Template } from "./types.js";

export class TemplateLoader {
  private readonly cache = new Map<string, Template>();
  private readonly templatesDir: string;

  constructor(templatesDir = "templates") {
    this.templatesDir = templatesDir;
  }

  async load(name: string): Promise<Template> {
    if (this.cache.has(name)) {
      return this.cache.get(name) as Template;
    }

    const filePath = join(this.templatesDir, `${name}.json`);
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    const template = TemplateSchema.parse(parsed);

    this.cache.set(name, template);
    return template;
  }

  async loadAll(): Promise<Map<string, Template>> {
    const files = await readdir(this.templatesDir, { withFileTypes: true });
    const jsonFiles = files.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

    await Promise.all(
      jsonFiles.map(async (entry) => {
        const name = entry.name.replace(/\.json$/u, "");
        await this.load(name);
      })
    );

    return new Map(this.cache);
  }

  async listTemplateNames(): Promise<string[]> {
    const files = await readdir(this.templatesDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/u, ""))
      .sort();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export class TemplateRegistry {
  private readonly templates = new Map<string, Template>();
  private readonly loader: TemplateLoader;

  constructor(loader: TemplateLoader) {
    this.loader = loader;
  }

  async initialize(): Promise<void> {
    const loaded = await this.loader.loadAll();
    this.templates.clear();
    for (const [name, template] of loaded.entries()) {
      this.templates.set(name, template);
    }
  }

  async get(name: string): Promise<Template> {
    if (this.templates.has(name)) {
      return this.templates.get(name) as Template;
    }

    const loaded = await this.loader.load(name);
    this.templates.set(name, loaded);
    return loaded;
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }

  list(): Template[] {
    return [...this.templates.values()];
  }

  listNames(): string[] {
    return [...this.templates.keys()].sort();
  }

  async refresh(): Promise<void> {
    this.loader.clearCache();
    await this.initialize();
  }
}
