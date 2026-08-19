# Demo Walkthrough

This walkthrough demonstrates the CLI + dashboard production flow.

## 1. Build and test

```bash
npm run build
npm test
```

Expected result:
- Build succeeds with no TypeScript errors.
- All test suites pass.

## 2. Verify CLI

```bash
node dist/cli.js --help
```

Expected result:
- CLI shows `init`, `task`, `workflow`, `metrics`, and `dashboard` commands.

## 3. Run dashboard

```bash
node dist/cli.js dashboard --port 3000
```

Expected result:
- Dashboard starts and serves metrics/workflow endpoints.

## 4. Validate package readiness

```bash
npm pack
```

Expected result:
- Tarball is created and includes `dist/`, templates, and core docs.

## Outcome

The CLI, dashboard, persistence, and packaging are all demonstrably functional via the checks above.
