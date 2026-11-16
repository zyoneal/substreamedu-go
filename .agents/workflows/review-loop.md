---
description: Run an isolated fresh-context code review loop (author vs separate reviewer subagent) with severity triage, evidence-based rebuttal, and a 5-round cap.
argument-hint: "[spec-path or base-branch]"
---

Run a structured, isolated review loop between the **Author** (current session) and a **Fresh-Context Reviewer** (a dedicated subagent that never saw how the code was written).

## Core Invariants

1. **Fresh Context**: Spawn the reviewer via `invoke_subagent` (`TypeName: "research"`, `Role: "Isolated Code Reviewer"`). Give it **only**:
   - The active spec / acceptance criteria (e.g., `context/feature_specs/<N>_*.md`), and
   - Instructions to inspect `git diff` / `git status` and the touched files.
   - **Never** paste the author's reasoning, chat history, or "what I meant to do".
2. **One Reviewer Per Task/PR**: Reuse the **same** reviewer `conversationId` across all rounds via `send_message` instead of spawning a new subagent on every round.
3. **Strict Scope ("One Slice")**: The reviewer must judge **only** against the spec's Acceptance Criteria, `AGENTS.md` invariants, and concrete runtime bugs/security/regressions. Do **not** expand scope or suggest unrelated refactors.
4. **Severity Triage**:
   - `blocker` — data loss, security vulnerability, broken invariant, or violated acceptance criterion (must fix).
   - `must-fix` — concrete runtime bug, race, or missing edge-case guard in the diff (must fix).
   - `minor` — non-blocking note; does **not** block approval or trigger another round.
5. **Evidence-Based Rebuttal**: The author is **not** forced to accept false positives. If a finding is wrong, the author replies to the reviewer with concrete evidence (a test output, benchmark, or exact code trace) rather than making an unnecessary edit.
6. **Hard 5-Round Cap**: Track `round = 1..5`. If `blocker` or `must-fix` items remain after Round 5, **stop the loop immediately** and escalate to the user with the remaining open items.

## Execution Steps

1. **Round 1 (Initial Review)**:
   - Confirm `git diff` is ready and `verify.sh` / targeted tests pass on the current `HEAD`.
   - Call `invoke_subagent` (`TypeName: "research"`, `Role: "Isolated Code Reviewer"`) with the spec path and diff command (`git diff` / `git diff origin/main...HEAD`).
2. **Triage & Respond**:
   - If the reviewer returns `0 blocker` and `0 must-fix` findings: **Approved** — end the loop.
   - Otherwise, for each `blocker` / `must-fix`:
     - Either apply the minimal fix (and re-run tests + `verify.sh`), **or** prepare a concrete evidence-based rebuttal.
3. **Rounds 2–5 (Wake Existing Reviewer)**:
   - Call `send_message` to the **same** reviewer `conversationId` listing:
     - Which findings were fixed (and that tests pass on the updated diff), and
     - Any evidence-based rebuttals.
   - Ask the reviewer to re-inspect the updated `git diff` and report only remaining `blocker` / `must-fix` issues.
4. **Exit**:
   - Stop as soon as `blocker == 0 && must-fix == 0`, or after Round 5 (escalate to user).
