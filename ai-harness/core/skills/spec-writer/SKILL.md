---
name: spec-writer
description: Turn a ticket into an approved spec in docs/specs/ before any implementation. Use for every Ship task (anything bigger than a ≤100-line single-concern fix, or any change to contracts, DB schema, dependencies or tooling).
argument-hint: "<TICKET> <short description>"
---

# Spec writer

Goal: a spec a reviewer can approve in five minutes, with a change boundary that a script can enforce.

## 1. Discover (read-only)

1. Read the ticket text. Restate the problem in two sentences and list open questions.
2. Read `docs/ai/overview.md`, `docs/ai/architecture.md`, `docs/ai/load.md`, and the relevant files in `docs/contracts/`.
3. Check `docs/specs/` and `docs/adr/` for overlapping or conflicting work. Do not re-decide something an accepted ADR already settled; cite it instead.
4. Find the code involved: entry points (controllers, listeners, schedulers), the services they call, persistence, outbound clients. Note `path:line` for each.
5. Answer explicitly:
   - What is in scope and what is out of scope?
   - Which contracts change? Are the changes backward compatible?
   - Which DB changes are needed, and in what order (expand → migrate → contract)? How do we roll back?
   - Failure modes: timeouts, retries, duplicates, partial failure. What does the caller see?
   - Load impact: extra queries per request, payload size, external rate limits.

If an open question changes the design, ask the human now. Do not guess.

## 2. Design it twice

Write at least two genuinely different options (different seam, data flow or ownership, not just different names). Compare them on locality of change, testability through a public seam, operational risk and migration cost. Pick one and say why in one sentence.

## 3. Write the spec

1. Copy `.harness/templates/spec.md` to `docs/specs/<TICKET>-<kebab-slug>.md`.
2. Fill every section. Keep **Allowed files** tight: list only the directories and files you expect to change, as backtick globs. Always include the spec file itself and the test directories you will touch.
3. The test plan names concrete test cases at the public seam, not "add tests".
4. Set `Status: Draft`.

## 4. Hand off

Post a summary: problem, chosen option and the rejected alternative, contract/DB impact, allowed files. Wait for approval (status → `Approved`) before writing production code. If the human tells you to proceed in the same session, record that in the spec header.

## Done when

- The spec file exists, is complete and has a non-empty Allowed files list.
- No production code has changed yet.
