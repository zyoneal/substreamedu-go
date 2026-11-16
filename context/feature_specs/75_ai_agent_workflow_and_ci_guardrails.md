# Feature Spec 75: AI-Agent Engineering Workflow & CI Guardrails

## Context & Objectives
Adopt proven AI-agent engineering practices from production multi-repo agent workflows:
1. **Isolated Review Loop (`.agents/workflows/review-loop.md` & `review-diff.md`)**:
   - Separate author and reviewer into distinct sessions: a fresh-context reviewer subagent receives only the active spec/acceptance criteria and `git diff` (never the author's implementation history).
   - Reuse one reviewer per task/PR across rounds (`send_message`) instead of spawning a new reviewer on every iteration.
   - Classify findings as `blocker`, `must-fix`, or `minor`; allow evidence-based rebuttal by the author (reply with measurements/tests instead of blind edits); enforce a hard **5-round cap** with human escalation.
2. **Diff-Only Linting & Commit-SHA Verification (`verify.sh`)**:
   - Run `golangci-lint` and `eslint` strictly on changed files/revisions by default so legacy warnings outside the task boundary do not derail agents into out-of-scope edits (keep `FULL_VERIFY=true` for full-tree checks).
   - Print the verified `HEAD` commit SHA at the end of `verify.sh` so agents never report stale green runs from earlier commits.
3. **Eliminate Fake-Green CI (`.github/workflows/ci.yml`)**:
   - Remove `|| true` from `test-backend` and `test-frontend` test steps and `continue-on-error: true` from `golangci-lint` (scoping lint to `--new-from-rev` so only new/changed code is gated).
   - Add a `ci-gate` aggregator job that verifies all active jobs succeeded on the current commit SHA.
4. **Agent Discipline Rules (`AGENTS.md`)**:
   - Codify **Mutation Check** (break implementation -> observe RED -> restore -> observe GREEN), **Commit-SHA Verification**, **Pilot-First Localization** (1 pilot language -> codify pitfalls -> scale), and **Value-Unit Reporting** (verified positive & negative checks instead of LOC/PR counts).

## Allowed files
- `context/feature_specs/75_ai_agent_workflow_and_ci_guardrails.md`
- `context/progress_tracker.md`
- `AGENTS.md`
- `verify.sh`
- `.github/workflows/ci.yml`
- `.agents/workflows/review-loop.md`
- `.agents/workflows/review-diff.md`

## Acceptance Criteria
1. `.agents/workflows/review-loop.md` defines the isolated fresh-session review loop (single persistent reviewer per task, `blocker`/`must-fix`/`minor` severity, evidence-based rebuttal, 5-round cap), and `.agents/workflows/review-diff.md` aligns with the same severity model.
2. `verify.sh` runs Go and Frontend linting on changed files/revisions by default (preserving `FULL_VERIFY=true` for full-tree) and outputs the verified `git rev-parse HEAD` SHA.
3. `.github/workflows/ci.yml` no longer swallows test/lint failures via `|| true` or `continue-on-error: true`, scopes `golangci-lint` to new/changed code, and includes a `ci-gate` aggregator job.
4. `AGENTS.md` documents Fresh-Session Review Loop, Mutation Check, Commit-SHA Verification, Pilot-First Localization, and Value-Unit Reporting.
5. `ALLOW_PROTECTED_CHANGES=true ./verify.sh` passes cleanly after all edits.
