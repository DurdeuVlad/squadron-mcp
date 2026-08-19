# Sprint 007: AI Quality Assurance - Quick Reference

## Overview
Automatically inject intelligent, context-aware QA prompts throughout workflows. AI detects what it's working on (code, docs, configs) and injects appropriate quality checks.

**Duration:** 3-4 days  
**Impact:** 50% reduction in rework, early issue detection

---

## Task Breakdown

| Task | Time | Focus |
|------|------|-------|
| **A** | 1 day | Build QA prompt library (800+ lines, 50+ contexts) |
| **B** | 1 day | Context detection & prompt selection based on file type |
| **C** | 1 day | Workflow integration with 3 injection points |
| **D** | 1 day | Self-review system & quality tracking |

**Total:** 3-4 days

---

## Key Innovation: Context-Aware QA

### Automatic Detection Examples

**Code File (Python):**
```python
# src/api/routes/auth.py
def login(username, password):
    ...
```
**Injected Prompts:**
- Does the code follow PEP 8 style guidelines?
- Are there type hints for parameters?
- Is error handling comprehensive?
- Are there security vulnerabilities (SQL injection)?
- Is the code testable?

**Automated Checks:** `ruff check`, `mypy`, `pytest`

---

**Documentation (README.md):**
```markdown
# Project Name
```
**Injected Prompts:**
- Does the README include installation instructions?
- Are there usage examples with code snippets?
- Is the purpose clearly stated?
- Are dependencies listed?
- Are links working?

---

**Config File (JSON):**
```json
{
  "apiKey": "...",
  "timeout": 5000
}
```
**Injected Prompts:**
- Is the JSON valid and properly formatted?
- Are all required fields present?
- Are sensitive values excluded?
- Is structure consistent with schema?

**Automated Checks:** `jsonlint`, `ajv validate`

---

## Perspective Overlays

If workflow has `perspective: "security"`, **additional prompts added:**
- Have you considered OWASP Top 10 vulnerabilities?
- Is authentication multi-factor where appropriate?
- Are dependencies scanned for vulnerabilities?
- Is sensitive data encrypted?
- Are audit logs maintained?

---

## QA Injection Points

### Point 1: After Sprint Plan
- Reviews task breakdown for completeness
- Checks if goals are achievable
- Validates dependencies

### Point 2: After Task Creation
- Reviews task specs for clarity
- Checks acceptance criteria
- Validates implementation approach

### Point 3: After Each Task Execution
- Context-aware QA based on file type
- Automated checks run (linting, tests)
- Self-review before reporting
- **Critical failures halt workflow**

### Point 4: Final QA
- Comprehensive review of all work
- Quality score aggregation
- Trend analysis

---

## Self-Review System

**Before reporting back, agent:**
1. Reviews own output against QA criteria
2. Rates work 1-10 honestly
3. Lists specific issues found
4. Proposes mitigations
5. Assesses confidence (low/medium/high)

**Example Self-Review:**
```
Quality Score: 8/10

Issues Found:
- Missing type hint for return value in calculate_score() (line 45)
- No test coverage for edge case: empty input list

Mitigations:
- Added type hint: def calculate_score() -> float
- Created test_empty_list() test case

Confidence: high - work is production-ready after fixes

Recommendations:
- Consider adding docstring examples
- Could optimize algorithm with memoization
```

---

## Quality Metrics Tracked

**Per Workflow:**
- Average quality score (1-10)
- Checks passed/failed
- Issues by severity (critical/high/medium/low)
- Agent performance (Claude vs Gemini vs Codex)
- Category performance (code vs docs vs configs)

**Trend Analysis:**
- Quality trends over last 10 workflows
- Most common issue types
- Agent strengths/weaknesses
- Improvement opportunities

---

## Configuration

```bash
# .env
QA_ENABLED=true                       # Enable automatic QA
QA_HALT_ON_CRITICAL=true              # Stop on critical failures
QA_SELF_REVIEW=true                   # Agents review own work
QA_AUTOMATED_CHECKS=true              # Run linting/tests
QA_MIN_QUALITY_SCORE=7                # Minimum acceptable (1-10)
```

---

## Success Criteria

- ✅ Detects file type with >95% accuracy
- ✅ Loads appropriate prompts for context
- ✅ QA checks run at 3+ workflow stages
- ✅ Early issue detection (>60% found before final QA)
- ✅ Reduces rework by 50%
- ✅ Quality scores correlate with actual quality
- ✅ Self-review catches issues before reporting

---

## Example Workflow with QA

**User:** "Implement JWT authentication"

**AI:**
1. Creates sprint plan
   - 🔍 QA: Reviews plan completeness → Score 8/10 ✅
2. Creates 6 task specs
   - 🔍 QA: Reviews task clarity → Score 9/10 ✅
3. Task 1: Create models/user.py
   - 🔍 QA: Detects Python code
   - 📋 Injects: PEP 8, type hints, security checks
   - 🤖 Runs: `ruff check`, `mypy`, `pytest`
   - 🧠 Self-review: Found missing docstring, added it
   - ✅ Score: 9/10
4. Task 2: Create routes/auth.py
   - 🔍 QA: Detects Python + security context
   - 📋 Injects: Security prompts (SQL injection, XSS, auth)
   - 🤖 Runs: `bandit` (security scanner)
   - 🧠 Self-review: Found hardcoded secret, moved to env var
   - ✅ Score: 8/10
5. ... continues for all tasks
6. Final QA: Average score 8.5/10 ✅

**Result:** High-quality implementation with security validated at every step

---

## File Structure

```
sprints/sprint-007-ai-quality-assurance/
  README.md                      # Complete sprint plan
  SPRINT_SUMMARY.md              # This file
  
src/config/
  qa-prompts.json                # 800+ lines, 50+ contexts
  qa-perspectives.json           # Security, performance, cost, etc.
  
src/tools/
  detect-qa-context.ts           # Auto-detect file type
  inject-qa-prompts.ts           # Build context-aware prompts
  self-review.ts                 # Agent reviews own work
  generate-qa-report.ts          # Comprehensive reporting
  
src/state/
  quality-tracker.ts             # Metrics and trends
  
src/tools/execute-workflow.ts    # Modified with 3 QA injection points
```

---

## Agent Assignment

**Gemini:** Code review (Python, TypeScript, JavaScript)  
**Claude:** Editorial review (docs, user-facing)  
**Codex:** Practical validation (configs, database, automated checks)

---

## Quick Start (For Codex)

```bash
cd c:/Users/User/Documents/Github/mcp-agent-orchestrator

# Day 1: Create QA prompt library
mkdir -p src/config
touch src/config/qa-prompts.json
touch src/config/qa-perspectives.json

# Day 2: Context detection
mkdir -p src/tools
touch src/tools/detect-qa-context.ts
touch src/tools/inject-qa-prompts.ts

# Day 3: Workflow integration
# Modify src/tools/execute-workflow.ts

# Day 4: Self-review system
touch src/tools/self-review.ts
touch src/state/quality-tracker.ts
```

---

## Token Impact

**Per QA check:** ~150-200 tokens  
**Per workflow:** ~800-1200 tokens (4-6 checks)  
**Value:** Prevents 2-3 revision cycles = 5000+ tokens saved

**Net savings:** 75-80% reduction in total tokens (including QA overhead)

---

## Notes

- Start with warnings only (QA_HALT_ON_CRITICAL=false) initially
- Self-review is the most valuable feature - agents catch their own mistakes
- Automated checks + AI prompts = comprehensive quality assurance
- Context awareness is critical - generic QA is much less effective
- Quality trends help identify systematic issues in agent performance
