import { describe, expect, it } from "vitest";

import { TemplateLoader, TemplateRegistry } from "../../src/templates/loader.js";
import { isTaskTemplate } from "../../src/templates/types.js";

describe("TemplateLoader", () => {
  it("loads a template from disk", async () => {
    const loader = new TemplateLoader("templates");
    const template = await loader.load("code-review");

    expect(template.name).toBe("code-review");
  });

  it("caches loaded templates", async () => {
    const loader = new TemplateLoader("templates");
    const first = await loader.load("typescript-feature");
    const second = await loader.load("typescript-feature");

    expect(first).toBe(second);
  });

  it("loads all templates", async () => {
    const loader = new TemplateLoader("templates");
    const loaded = await loader.loadAll();

    expect(loaded.size).toBeGreaterThanOrEqual(5);
  });
});

describe("TemplateRegistry", () => {
  it("initializes from loader and lists template names", async () => {
    const loader = new TemplateLoader("templates");
    const registry = new TemplateRegistry(loader);
    await registry.initialize();

    expect(registry.listNames()).toContain("code-review");
    expect(registry.listNames().length).toBeGreaterThanOrEqual(5);
  });

  it("returns task template shape for code-review", async () => {
    const loader = new TemplateLoader("templates");
    const registry = new TemplateRegistry(loader);
    const template = await registry.get("code-review");

    expect(isTaskTemplate(template)).toBe(true);
  });
});
