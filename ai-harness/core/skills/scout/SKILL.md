---
name: scout
description: Investigative, read-only research or architectural discovery tasks. Surveys code, analyzes dependencies, diagnoses architecture, or audits behavior without modifying source code. Delivers findings in a structured Markdown report.
argument-hint: "<question or topic to investigate>"
allowed-tools:
  - read
  - grep
  - glob
  - exec
---

# Scout: Read-Only Investigation Protocol

A Scout task investigates a question, maps an unfamiliar workflow, traces data flows, or audits architecture.

> [!CAUTION]
> **SOURCE FILES ARE STRICTLY READ-ONLY**
> A Scout task must NEVER edit, refactor, format, or mutate source code files in the project. Any change to repository state is restricted to writing the final markdown report.

---

## 1. Execution Steps

1. **Clarify Objective**: Restate the question or thesis in 1–2 sentences.
2. **Targeted Discovery**:
   - Trace inbound entry points (controllers, Kafka message listeners, scheduled jobs).
   - Trace business logic through domain services.
   - Inspect persistence queries, migrations, or outbound HTTP/RPC calls.
   - Run read-only profiling, curl commands, or diagnostics if helpful.
3. **Capture Ground Truth**:
   - For every claim or architectural finding, record exact file paths and line numbers (`path/to/File.ext:line`).
   - If an assumption cannot be proven from code, explicitly declare it as an unverified hypothesis.

---

## 2. Deliverable Format

Save the report to `docs/scout/<TICKET>-<slug>.md` using `.harness/templates/scout-report.md`:

```markdown
# Scout Report: <Topic>

- **Ticket**: <TICKET or N/A>
- **Date**: YYYY-MM-DD
- **Scope Read**: <list of packages/directories analyzed>

## Executive Summary
Concise 3-5 line answer to the user's question.

## Technical Findings
1. **[Finding 1]** (`src/main/java/.../OrderService.java:128`): Explanation of behavior with code reference.
2. **[Finding 2]** (`src/main/java/.../KafkaConsumer.java:45`): Explanation of message processing and idempotency handling.

## Architectural Trade-offs & Risks
- Concrete risks, edge cases, latency implications, or tech debt observed.

## Recommended Action
- Next step (e.g. Ship task with spec scope, Fast-fix, or No action needed).
```
