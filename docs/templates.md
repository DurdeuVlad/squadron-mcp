# Template System

Sprint 002 introduces a validated template system for reusable orchestration patterns.

## Supported Template Shapes

- Task templates: include `inputs`, `executionSteps`, `expectedOutputs`, `successCriteria`
- Workflow templates: include `workflow` step definitions

Validation is implemented in `src/templates/types.ts` with Zod.

## Loader and Registry

- `TemplateLoader` (`src/templates/loader.ts`)
  - `load(name)` loads and validates a single JSON template
  - `loadAll()` reads all `*.json` files from the templates directory
  - `listTemplateNames()` lists discoverable template names
- `TemplateRegistry`
  - `initialize()` preloads all templates
  - `get(name)` returns a template (lazy-loaded if needed)
  - `list()` and `listNames()` expose loaded templates

## Built-in Templates

- `code-review`
- `typescript-feature`
- `typescript-test`
- `documentation`
- `debate-generation`
- `user-standard-workflow`

## Tool Integration

`create_task_spec` now resolves the template from `TemplateRegistry` and uses template execution steps, outputs, and success criteria to generate and persist task specs.
