# Sprint 001: Core MCP Server Infrastructure

**Sprint Goal:** Build foundational MCP server with basic tool infrastructure and TypeScript setup

**Duration:** 2-3 days (4-6 hours)

**Priority:** CRITICAL (blocks all other work)

---

## Problem Statement

We need a working MCP (Model Context Protocol) server that can:
- Connect to VS Code/Claude via stdio transport
- Register and expose tools to agents
- Handle tool invocations with proper error handling
- Provide basic logging and debugging

This is the foundation for all agent orchestration features.

---

## Tasks

### Task 1: TypeScript Project Setup ⚙️
**Estimated Complexity:** Easy  
**Time:** 30 minutes

**Inputs:**
- package.json (already created)
- tsconfig.json (already created)
- Project structure

**Steps:**
1. Run `npm install` to install dependencies
2. Verify TypeScript compiles (`npm run build`)
3. Set up vitest for testing
4. Create src/index.ts entry point
5. Test basic build pipeline

**Success Criteria:**
- npm install completes without errors
- TypeScript compiles successfully
- npm test runs (even if no tests yet)

---

### Task 2: Basic MCP Server Setup 🚀
**Estimated Complexity:** Medium  
**Time:** 1-2 hours

**Inputs:**
- @modelcontextprotocol/sdk documentation
- MCP server examples

**Steps:**
1. Create src/index.ts with MCP server initialization
2. Set up stdio transport connection
3. Implement server capabilities declaration
4. Add basic error handling
5. Test connection with MCP inspector

**Implementation Guide:**
```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "squadron",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [],
}));

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Squadron server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

**Success Criteria:**
- Server starts without errors
- Responds to ListTools request (empty list OK)
- Handles unknown tool calls gracefully
- Can be tested with MCP inspector

---

### Task 3: Implement First Tool (Ping) 🏓
**Estimated Complexity:** Easy  
**Time:** 30 minutes

**Purpose:** Validate tool registration and invocation pipeline

**Steps:**
1. Create src/tools/ping.ts
2. Register ping tool in server
3. Implement simple handler (return "pong")
4. Write test for ping tool
5. Test via MCP inspector

**Implementation:**
```typescript
// src/tools/ping.ts
export interface PingInput {
  message?: string;
}

export function ping(input: PingInput) {
  return {
    response: "pong",
    echo: input.message || "no message",
    timestamp: new Date().toISOString(),
  };
}

// Add to src/index.ts
import { ping } from "./tools/ping.js";

// In ListToolsRequestSchema handler:
tools: [
  {
    name: "ping",
    description: "Test tool that responds with pong",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Optional message to echo" },
      },
    },
  },
]

// In CallToolRequestSchema handler:
if (request.params.name === "ping") {
  const result = ping(request.params.arguments || {});
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}
```

**Success Criteria:**
- ping tool listed in ListTools response
- ping tool invocation returns correct response
- Test passes

---

### Task 4: Error Handling & Logging 🐛
**Estimated Complexity:** Medium  
**Time:** 1 hour

**Steps:**
1. Add structured logging (console.error for logs)
2. Implement error wrapper for tool calls
3. Add input validation pattern (Zod)
4. Test error scenarios

**Implementation:**
```typescript
// src/utils/logger.ts
export function log(level: "info" | "warn" | "error", message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...meta };
  console.error(JSON.stringify(logEntry));
}

// src/utils/tool-wrapper.ts
import { z } from "zod";
import { log } from "./logger.js";

export function wrapTool<TInput, TOutput>(params: {
  name: string;
  schema: z.ZodType<TInput>;
  handler: (input: TInput) => TOutput | Promise<TOutput>;
}) {
  return async (input: unknown) => {
    try {
      log("info", `Tool invoked: ${params.name}`);
      
      const validatedInput = params.schema.parse(input);
      const result = await params.handler(validatedInput);
      
      log("info", `Tool completed: ${params.name}`);
      return result;
    } catch (error) {
      log("error", `Tool failed: ${params.name}`, { error });
      throw error;
    }
  };
}
```

**Success Criteria:**
- Logs appear in stderr
- Invalid input triggers validation error
- Errors don't crash server

---

### Task 5: Testing Infrastructure 🧪
**Estimated Complexity:** Medium  
**Time:** 1 hour

**Steps:**
1. Create tests/setup.ts for test utilities
2. Write tests for ping tool
3. Write tests for error handling
4. Set up test coverage reporting
5. Document testing patterns

**Example Test:**
```typescript
// tests/tools/ping.test.ts
import { describe, it, expect } from "vitest";
import { ping } from "../../src/tools/ping.js";

describe("ping tool", () => {
  it("should return pong", () => {
    const result = ping({});
    expect(result.response).toBe("pong");
  });

  it("should echo message", () => {
    const result = ping({ message: "hello" });
    expect(result.echo).toBe("hello");
  });

  it("should include timestamp", () => {
    const result = ping({});
    expect(result.timestamp).toBeDefined();
  });
});
```

**Success Criteria:**
- All tests pass
- Test coverage >80%
- npm test command works

---

### Task 6: Documentation & Examples 📚
**Estimated Complexity:** Easy  
**Time:** 30 minutes

**Steps:**
1. Create docs/getting-started.md
2. Document MCP server setup
3. Add example of testing with MCP inspector
4. Document development workflow
5. Update main README.md

**Success Criteria:**
- Documentation covers setup, development, testing
- Examples are runnable
- README links to docs

---

## Dependencies

```
Task 1 (TypeScript Setup)
  ↓
Task 2 (MCP Server Setup)
  ↓
Task 3 (Ping Tool) ← Task 4 (Error Handling)
  ↓                    ↓
Task 5 (Testing Infrastructure)
  ↓
Task 6 (Documentation)
```

---

## Success Criteria (Sprint Completion)

- [x] MCP server starts and connects successfully
- [x] ping tool works and is testable
- [x] Error handling prevents crashes
- [x] Comprehensive test suite (>80% coverage)
- [x] Documentation complete and accurate
- [x] `npm run build` succeeds
- [x] `npm test` succeeds
- [x] `npm run lint` succeeds

---

## Verification Commands

```bash
# Install and build
npm install
npm run build

# Run tests
npm test

# Test MCP server
npm run dev
# In another terminal:
npx @modelcontextprotocol/inspector

# Lint
npm run lint
```

---

## Outputs

### Code Artifacts
- src/index.ts - MCP server entry point
- src/tools/ping.ts - Example tool
- src/utils/logger.ts - Logging utility
- src/utils/tool-wrapper.ts - Tool error handling
- tests/tools/ping.test.ts - Test suite

### Documentation
- docs/getting-started.md
- README.md (updated with usage)

---

## Token Budget

**Estimated Token Usage:**
- Claude planning: 200 tokens
- Task specs: 150 tokens × 6 = 900 tokens
- Gemini execution: (uses Gemini budget, not counted)
- Claude reviews: 150 tokens × 6 = 900 tokens

**Total Claude Tokens:** ~2000 tokens

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP SDK changes | High | Pin to specific version in package.json |
| TypeScript config issues | Medium | Use standard config from MCP examples |
| Testing setup complexity | Low | Use vitest with minimal config |

---

## Next Sprint Preview

**Sprint 002** will build on this foundation by adding:
- create_task_spec tool
- delegate_task tool
- Basic template system
- In-memory state management

These tools require a working MCP server, which this sprint provides.

---

## Notes

- This sprint is execution-heavy, ideal for Gemini
- Claude reviews each task completion
- Focus on getting a working foundation, not perfection
- Can iterate and improve in future sprints

---

**Status:** Completed (2026-02-12)  
**Assigned To:** Gemini (execution), Claude (review)  
**Created:** 2026-02-12  
**Updated:** 2026-02-12
