# Orchestration Patterns

Coding-agent orchestration in the wild converges on the same skeleton under different names — Coordinator-Implementor-Verifier, Planner-Worker-Judge, Orchestrator-Subagents-CI Review, Lead Agent-Subagent-Evaluator. Squadron's default is the simplest member of that family: **Manager-Worker**, with the manager also acting as reviewer.

## The default: Manager-Worker, planner-as-reviewer

One agent (typically `claude`, role `planner`) creates task specs and delegates them; one or more agents (typically `gemini`/`codex`, role `executor`) do the work; the same planner reviews the result via `review_output` before deciding whether it's done.

```
create_task_spec  →  delegate_task  →  collect_report  →  review_output
   (planner)          (→ executor)      (executor)          (planner)
```

There's no separate reviewer agent in the default setup — the planner that assigned the task is also the one that judges it.

## Why planner-as-reviewer is the default, not just an option

This isn't a simplification made for lack of a better design — it's already how Squadron behaves today, with zero code changes:

- `review_output` (`src/tools/review-output.ts`) has no role or capability enforcement at all. It reads the task and report and records a decision — it never checks who's calling it.
- `delegate_task`'s `enforceTaskDelegation` (`src/enforcement/role-enforcer.ts`) only checks that the planner has `planning` capability and isn't itself role `executor`. It never forbids the same agent from later reviewing what it assigned.

So "planner doubles as reviewer" isn't a mode you opt into — it's just what happens when you call `review_output` yourself instead of delegating that too.

The reason to keep it that way: a dedicated reviewer agent means a third subprocess hop per task. Measured against a real subprocess delegation call (~$0.30, ~59 seconds, dominated by the CLI re-bootstrapping a full agent session — see [`configuration.md`](configuration.md#per-task-model-selection)), a separate reviewer roughly triples the cost and latency of every task for a check that a capable planner can usually do inline. Add one only when reviews are catching real problems the planner is missing — not by default.

## What's out of scope, and why

A full Coordinator-Implementor-Verifier setup — autonomous task scheduling and git-worktree isolation for parallel implementors — was considered and cut. Squadron is an MCP server, not the orchestrator: the connecting client (Claude Code or similar) already has its own subagent and worktree tooling. Rebuilding a scheduler inside Squadron would duplicate that for no clear win over "the calling agent decides what to delegate next, in whatever order it chooses." What Squadron does provide toward that end is dependency *information*, not execution control — see `dependsOn` and the `readiness` field on [`track_workflow`](tools.md#track_workflow), which let a connecting planner ask "what's safe to delegate next" without Squadron running a scheduler of its own.

Squadron also doesn't have a formal `orchestrationPattern` config setting to switch between named patterns. There's no behavioral difference to switch between yet — role enforcement already permits Manager-Worker with zero gating, so a mode selector would just be surface area with nothing behind it.

## A minimal recipe

```
create_task_spec(task: "...", executor: "gemini")
delegate_task(taskId, executor: "gemini")
collect_report(taskId, report: {...})
review_output(taskId, reviewer: "claude", decision: "approve" | "revise" | "reject")
```

`revise` sends the task back to `pending` for another delegation round; `reject` marks it `failed`. For multi-task work, wrap this in a workflow (`workflowId` on each call) and use `track_workflow` to see per-task status and readiness.
