# Contributing to MCP Agent Orchestrator

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive. We're building tools to help everyone work more efficiently.

## How to Contribute

### Reporting Issues

- **Check existing issues first** to avoid duplicates
- **Provide context:** What were you trying to do? What went wrong?
- **Include version info:** Node.js version, package version, OS
- **Minimal reproduction:** Provide steps to reproduce the issue

### Feature Requests

- **Describe the problem:** What are you trying to solve?
- **Propose solution:** How would you like it to work?
- **Consider alternatives:** Are there other ways to solve this?

### Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Make your changes** following the code style (see below)
3. **Add tests** for new features or bug fixes
4. **Update documentation** if you're changing behavior
5. **Run tests and lint:** `npm test && npm run lint`
6. **Submit PR** with clear description of changes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcp-agent-orchestrator.git
cd mcp-agent-orchestrator

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## Code Style

- **TypeScript:** Use strict TypeScript with proper types
- **Naming:** 
  - `camelCase` for functions and variables
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants
- **Files:** `kebab-case.ts` for file names
- **Line Length:** Max 100 characters
- **Quotes:** Double quotes for strings
- **Semicolons:** Always use them
- **Formatting:** Run `npm run format` before committing

## Testing Guidelines

- Write tests for new features and bug fixes
- Aim for >80% code coverage
- Use descriptive test names
- Test both success and error cases

**Test Structure:**
```typescript
describe("Feature", () => {
  it("should do something specific", () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = doSomething(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Documentation

- **Code comments:** Add JSDoc comments for public APIs
- **README updates:** Update README.md if behavior changes
- **Documentation:** Update docs/ if adding/changing features
- **Examples:** Add examples for new features

## Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

**Examples:**
```
feat(tools): add optimize_tokens tool

Implements token optimization analysis and recommendations
for workflows. Provides actionable insights for reducing
coordination overhead.

Closes #42
```

```
fix(state): prevent race condition in task updates

Added mutex lock to prevent concurrent task updates from
corrupting state.

Fixes #56
```

## Project Structure

```
mcp-agent-orchestrator/
├── src/              # Source code
│   ├── index.ts     # MCP server entry point
│   ├── cli.ts       # CLI entry point
│   ├── tools/       # MCP tool implementations
│   ├── templates/   # Template system
│   ├── state/       # State management
│   └── ...          # Other modules
├── tests/            # Test suites
├── templates/        # Built-in templates
├── docs/             # Documentation
└── examples/         # Example workflows
```

## Adding New Features

### Adding a New MCP Tool

1. Create tool file: `src/tools/my-tool.ts`
2. Define input schema (Zod)
3. Implement handler function
4. Write tests: `tests/tools/my-tool.test.ts`
5. Register in `src/index.ts`
6. Document in `docs/api-reference.md`
7. Add example to `examples/`

### Adding a New Template

1. Create template file: `templates/my-template.json`
2. Follow template schema (see `src/templates/types.ts`)
3. Add to templates list in docs
4. Create example usage

### Adding a New Storage Backend

1. Implement `StorageAdapter` interface
2. Add to storage configuration options
3. Write tests
4. Document in `docs/configuration.md`

## Release Process

Maintainers will handle releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.x.0`
4. Push tag: `git push --tags`
5. Publish to npm: `npm publish`
6. Create GitHub release

## Questions?

- **Issues:** https://github.com/vladddev/mcp-agent-orchestrator/issues
- **Discussions:** https://github.com/vladddev/mcp-agent-orchestrator/discussions
- **Email:** [Your Email]

---

Thank you for contributing! 🎉
