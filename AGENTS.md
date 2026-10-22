# AGENTS.md: Developer & AI Agent Operating System

Welcome to the **SubStreamEdu** repository. This codebase is managed under **Senior Engineer Spec-Driven Development (SDD)** with machine-enforced guardrails.

> [!IMPORTANT]
> **MANDATORY PROTOCOL FOR ALL AI AGENTS & PAIR-PROGRAMMING ASSISTANTS**
> Before writing, modifying, refactoring, or deleting ANY file in this repository, you MUST follow the instructions below without exception.

---

## 1. Pre-Flight Context Checklist (Progressive Disclosure)

Do not ingest unnecessary files. Load context strictly based on your task domain:

### Always Ingest (All Tasks):
1. [`/context/project_overview.md`](file:///Users/test/Desktop/substreamedu-go/context/project_overview.md) — Product scope, core user flows, and system boundaries.
2. [`/context/architecture.md`](file:///Users/test/Desktop/substreamedu-go/context/architecture.md) — System layers, communication patterns, storage, and architectural invariants.
3. [`/context/progress_tracker.md`](file:///Users/test/Desktop/substreamedu-go/context/progress_tracker.md) — Active phase, currently assigned task, and architectural decision log.
4. Active specification in [`/context/feature_specs/`](file:///Users/test/Desktop/substreamedu-go/context/feature_specs/) (e.g. `54_ai_harness_workflow_modernization.md`).

### Domain-Specific Ingestion:
- **Go Microservices Tasks** (`substreamedu-*-go/`):
  - [`/context/code_standards.md`](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md) (Section 1 & 3) — Go backend standards, error formats, and database rules.
  - [`/context/api_specs/`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/) — Formal OpenAPI service contracts and gateway route mappings.
  - [`/context/expected_load.md`](file:///Users/test/Desktop/substreamedu-go/context/expected_load.md) — System capacity, latency SLAs, and resource bounds.
- **Frontend Client Tasks** (`substreamedu-frontend/`):
  - [`/context/code_standards.md`](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md) (Section 2) — TypeScript/React guidelines and Humble Object pattern.
  - [`/context/ui_context.md`](file:///Users/test/Desktop/substreamedu-go/context/ui_context.md) — Design tokens, typography, bento grid layout rules, and UI anti-patterns.

---

## 2. Core Execution Rules

1. **One Task / Spec at a Time**: Never attempt to tackle multiple feature specs simultaneously. Stick solely to the active spec's boundary.
2. **Machine-Enforced File Boundaries**:
   - Touch only the files explicitly listed under `## Allowed files` in the active spec.
   - Enforced automatically by `.harness/scripts/check-spec-scope.sh`. Violations will fail the build.
3. **Fast-Path Workflow (≤ 100 LOC)**:
   - For micro-fixes, typos, or single-concern bug fixes touching $\le 100$ lines, a full spec is waived.
   - Requires a deterministic failing test (RED) $\to$ minimal fix (GREEN) $\to$ `./verify.sh`.
4. **Tooling Immutability & Anti-Tamper Guard**:
   - AI agents are strictly forbidden from altering compiler configs, linters, or build scripts to force checks to pass (`.golangci.yml`, `tsconfig.json`, `package.json`, `go.mod`, `.harness/*`).
   - Enforced by `.harness/scripts/check-protected-files.sh`.
5. **Task Classification (Ship vs Scout)**:
   - **Ship Tasks**: Deliver production code, migrations, or UI improvements through approved specs.
   - **Scout Tasks**: Research, bug reproduction, architectural discovery. Strictly read-only on source files, delivering output in markdown. Skill: `scout`.
6. **Bug Diagnosis — Feedback Loop First**:
   - Never guess or patch code blindly. Build a single-command reproducible test (unit test or integration script) that turns **RED** before touching implementation code. Skill: `diagnosing-bugs`.
7. **Deep Modules & Design It Twice**:
   - Encapsulate complexity behind clean seams. For non-trivial architectural decisions, formulate 2–3 alternatives at the spec stage before coding. Skill: `codebase-design`.
8. **Never Tear Down Unlanded Work**:
   - Never run destructive git commands (`reset --hard`, `checkout .`, `clean -fd`, `push --force`, `--no-verify`).
   - Monitored and blocked by `.harness/scripts/devin-pre-exec.sh` PreToolUse hook.
9. **Single Definition of Done (`make verify` or `./verify.sh`)**:
   - Every task must pass `./verify.sh` cleanly before being considered complete.
   - Runs anti-tamper check, spec boundary check, Go lint/tests, and Frontend lint/tests.
10. **Progress Tracker Synchronization**:
    - **Start**: Update `In Progress` in `/context/progress_tracker.md`.
    - **Finish**: Move to `Recent Completed` and log ADR.
