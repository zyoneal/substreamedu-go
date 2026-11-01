# Feature Spec 65: Nick Vels Autopilot Skill & Project Integration

## 1. Objective & Context
Integrate the `autopilot` development framework skill from `https://github.com/nick-vels/skills/` into the SubStreamEdu repository and apply its end-to-end orchestration, project memory (`AGENTS.md` + `CLAUDE.md`), ubiquitous glossary (`CONTEXT.md`), and live telemetry dashboard/run state (`.autopilot/`) to the project.

Key deliverables:
1. **Skill Installation (`.agents/skills/autopilot/`, `.agents/workflows/autopilot.md`, `skills-lock.json`)**:
   - Install `autopilot` v2.2.1 (`SKILL.md`, `phases/*.md`, `phases/dashboard-template.html`, `prompts/*.md`, `tools/ap.py`).
   - Register `/autopilot` workflow in `.agents/workflows/autopilot.md` and lock its cryptographic SHA-256 hash in `skills-lock.json`.
2. **Project Memory & Ubiquitous Language (`AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`)**:
   - Append the `<!-- autopilot:start --> ... <!-- autopilot:end -->` project memory block to `AGENTS.md` with verified commands, architectural pointers, known traps, environment variable names, «Правка без автопилота», and «История git» rules while preserving 100% of existing SDD guardrails.
   - Add `CLAUDE.md` (`@AGENTS.md`) so Claude Code, Cursor, Codex, and Antigravity resolve `AGENTS.md` consistently.
   - Expand `CONTEXT.md` with SubStreamEdu's ubiquitous domain glossary (`Lexeme`, `Recognition Card`, `Production Card`, `FSRS`, `Active Listening Blur`, `Transactional Outbox`, etc.) and synonyms to avoid (`_Избегать_`).
3. **Autopilot Instruments & Baseline Run (`.autopilot/`, `.gitignore`)**:
   - Provision `.autopilot/ap.py`, `.autopilot/dashboard.html`, `.autopilot/index.html`, `.autopilot/README.md`, `.autopilot/PROGRESS.md`, and complete the initial baseline flight across all 8 stages (`preflight` → `manifest` → `briefing` → `spec` → `plan` → `build` → `review` → `final`) with gates G1–G4 verified and recorded in `.autopilot/state.js`.

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Copy only `SKILL.md` into `.agents/skills/autopilot/` without `phases/`, `prompts/`, `tools/ap.py`, or `.autopilot/` project state | Broken: `SKILL.md` is a phase orchestrator that delegates to `phases/*.md`, `prompts/*.md`, and `tools/ap.py`. Without them or `.autopilot/`, the skill and dashboard cannot function. Rejected. |
| B | Overwrite `AGENTS.md` and `CONTEXT.md` with raw Autopilot templates | Violates both SubStreamEdu SDD guardrails and Autopilot's own `0-memory.md` / `9-memory.md` rule («Всё, что написали вы, — неприкосновенно. Autopilot пишет только внутри своих меток»). Rejected. |
| C | Install the full `autopilot` skill tree, register workflow & `skills-lock.json`, append `<!-- autopilot:start -->` memory markers to `AGENTS.md` + `@AGENTS.md` in `CLAUDE.md`, enrich `CONTEXT.md` glossary non-destructively, and execute a full G1–G4 verified baseline flight in `.autopilot/` | Preserves all existing SDD rules while enabling the full Autopilot dashboard, manifest traceability, `PROGRESS.md` handoff, and subagent contracts. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/65_autopilot_skill_and_project_integration.md`
- `context/feature_specs/66_homepage_perfection_and_humble_object.md`
- `context/feature_specs/67_dashboard_perfection_and_humble_object.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/HomePage/**`
- `substreamedu-frontend/src/components/DashboardPage/**`
- `.agents/skills/autopilot/**`
- `.agents/workflows/autopilot.md`
- `skills-lock.json`
- `.gitignore`
- `AGENTS.md`
- `CLAUDE.md`
- `CONTEXT.md`
- `context.md`
- `.autopilot/**`

## 4. Verification Checklist
- [ ] `.harness/scripts/check-protected-files.sh` passes.
- [ ] `.harness/scripts/check-spec-scope.sh` passes.
- [ ] `python3 .autopilot/ap.py check-plan` passes Gate G3 with 0 errors.
- [ ] Full `./verify.sh` passes (Go microservices + Frontend 66/66 test suites).
