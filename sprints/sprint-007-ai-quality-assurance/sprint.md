# Sprint 007: AI Quality Assurance - Sprint Plan

See [README.md](README.md) for complete sprint documentation.

## Quick Links

- **[README.md](README.md)** - Complete sprint plan with all 4 sub-sprints
- **[SPRINT_SUMMARY.md](SPRINT_SUMMARY.md)** - Quick reference guide

## Overview

**Duration:** 3-4 days  
**Status:** Completed (2026-02-12)  
**Goal:** Automatically inject context-aware QA prompts throughout workflows

## Key Innovation

**AI automatically detects file type and injects appropriate QA prompts:**

- Python code → PEP 8, type hints, security, tests
- Documentation → Clarity, examples, completeness
- JSON config → Validation, schema, secrets excluded
- Database migrations → Reversibility, indexes, data preservation
- Tests → Coverage, edge cases, independence

**Plus perspective overlays:**
- Security audit → OWASP Top 10, encryption, auth
- Performance audit → Complexity, caching, scalability
- Cost audit → API usage, resource optimization

## Sub-Sprints

### 007-A: QA Prompt Library (1 day)
Create 800+ lines of context-specific prompts for 50+ scenarios

### 007-B: Context Detection (1 day)
Auto-detect file type and select appropriate prompts

### 007-C: Workflow Integration (1 day)
Inject QA at 3 points: sprint plan, task creation, each task execution

### 007-D: Self-Review System (1 day)
Agents review own work before reporting, quality tracking

## Success Criteria

- ✅ Context detection >95% accuracy
- ✅ Early issue detection >60%
- ✅ 50% reduction in rework
- ✅ Quality scores correlate with actual quality
- ✅ Self-review catches issues before reporting

## Expected Impact

**Before QA automation:**
- Issues found at end (step 11)
- 3-5 revision cycles common
- Generic QA prompts miss context-specific issues

**After QA automation:**
- Issues found immediately (each step)
- 1-2 revision cycles typical (50% reduction)
- Context-aware prompts catch domain-specific problems
- Self-review catches issues before reporting back

**Net result:** 50% faster iteration, higher quality output, fewer wasted tokens

## Configuration

```bash
QA_ENABLED=true                    # Enable automatic QA
QA_HALT_ON_CRITICAL=true           # Stop on critical failures
QA_SELF_REVIEW=true                # Agents review own work
QA_AUTOMATED_CHECKS=true           # Run linting/tests
QA_MIN_QUALITY_SCORE=7             # Minimum acceptable
```

## Files to Create

```
src/config/
  qa-prompts.json                  # 800+ lines, 50+ contexts
  qa-perspectives.json             # Security, performance, etc.

src/tools/
  detect-qa-context.ts             # Auto-detect file type
  inject-qa-prompts.ts             # Build prompts
  self-review.ts                   # Self-review system
  generate-qa-report.ts            # Reporting

src/state/
  quality-tracker.ts               # Metrics and trends

src/tools/execute-workflow.ts      # Modified with QA injection points
```

## Next Steps

1. Read [README.md](README.md) for full implementation details
2. Start with Sprint 007-A (QA Prompt Library)
3. Test each component as you go
4. Integrate with existing workflow executor
