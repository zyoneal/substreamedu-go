# AGENTS.md: Developer & AI Agent Operating System

Welcome to the **SubStreamEdu** repository. This codebase is managed under **Senior Engineer Spec-Driven Development (SDD)**.

> [!IMPORTANT]
> **MANDATORY PROTOCOL FOR ALL AI AGENTS & PAIR-PROGRAMMING ASSISTANTS**
> Before writing, modifying, refactoring, or deleting ANY file in this repository, you MUST follow the instructions below without exception.

---

## 1. Mandatory Pre-Flight Context Checklist
Every AI agent starting a new turn or task MUST read the following 6 context files in `/context/`:
1. [`/context/project_overview.md`](file:///Users/test/Desktop/substreamedu-go/context/project_overview.md) — Product scope, core user flows, and success criteria.
2. [`/context/architecture.md`](file:///Users/test/Desktop/substreamedu-go/context/architecture.md) — System layers, communication patterns, storage strategies, and non-negotiable system invariants.
3. [`/context/code_standards.md`](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md) — Go backend standards, TypeScript/React guidelines, error formats, and database rules.
4. [`/context/ai_workflow_rules.md`](file:///Users/test/Desktop/substreamedu-go/context/ai_workflow_rules.md) — Single-spec atomicity, cross-boundary protection, and verification rules.
5. [`/context/ui_context.md`](file:///Users/test/Desktop/substreamedu-go/context/ui_context.md) — Design tokens, typography, bento grid layout rules, and UI anti-patterns.
6. [`/context/progress_tracker.md`](file:///Users/test/Desktop/substreamedu-go/context/progress_tracker.md) — Active phase, currently assigned task, and architectural decision log.

---

## 2. Execution Rules
1. **One Task / Spec at a Time**: Never attempt to tackle multiple feature specs or refactoring scopes simultaneously. Locate the active spec in [`/context/feature_specs/`](file:///Users/test/Desktop/substreamedu-go/context/feature_specs/) and stick solely to its boundary.
2. **Strict File Boundaries**: Touch only the files explicitly permitted under the spec's `Implementation Rules`.
3. **No Unspec'd Mutations**: Do not add dependencies, alter database columns, or modify API signatures without an approved spec.
4. **Progress Tracker Synchronization**:
   - **Start**: Record task start in `/context/progress_tracker.md` under `In Progress`.
   - **Finish**: Move task to `Completed`, log architectural decisions, and note test results.
5. **Mandatory Verification**: Run all tests, linting, and build commands specified in the active spec's `Verification Checklist` before marking any task complete.
