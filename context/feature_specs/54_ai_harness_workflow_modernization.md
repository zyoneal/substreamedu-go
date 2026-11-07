# Spec 54: AI Harness & SDD Workflow Modernization

- **Status**: Completed

- **Owner**: AI Systems & SDD Platform Engineering
- **Related ADR**: ADR-127
- **Depends On**: Spec 53 (`53_flashcards_completion_screen_css_restoration.md`), ADR-124 (`claude-sdlc guardrails`)

---

## 1. Problem Statement & Scope

A comprehensive audit of the AI development harness in `substreamedu-go` identified 5 structural friction points degrading agent performance, context window efficiency, and architectural compliance:

1. **Context Blowup**: `context/progress_tracker.md` expanded to **202 KB (633 lines)**. Ingesting this monolithic history on every turn exhausts context windows, slows down reasoning, and costs significant tokens without providing actionable context.
2. **Dead Duplicate Codebase**: The `ai_agent_setup/` directory contains **1,940 files (39 MB)** of stale forks with hardcoded `/Users/test/` absolute paths, drifting from production rules.
3. **Skill Bloat**: `.agents/skills/` contains 61 skills (38 MB) with redundant and overlapping frontend packages (e.g. `design-taste-frontend-v1`, `gpt-taste`, `stitch-design-taste`, `variant`, `break`) that dilute model attention.
4. **Unenforced Rules**: Critical SDLC guardrails (file size caps, layer boundaries, forbidden commands, immutable tooling configs) exist only as prose in markdown, with zero automated machine verification in git or agent lifecycles.
5. **Rule Contradictions**: Rule 10 in `AGENTS.md` claims CI pipelines were removed, yet active workflows remain in `.github/workflows/` and `.gitlab-ci.yml`.

This specification modernizes the `substreamedu-go` harness to an automated, progressive-disclosure SDD architecture with deterministic machine verification.

---

## 2. Technical Requirements

1. **Memory & Context Pruning**:
   - Archive legacy task history (ADR-001 through ADR-126) from `context/progress_tracker.md` into `context/archive/progress_tracker_history.md`.
   - Reinitialize `context/progress_tracker.md` as an active, high-density status board (≤ 50 lines) tracking active work, immediate backlog, and recent decisions.
   - Completely purge the redundant `ai_agent_setup/` directory.

2. **Automated Machine Enforcement (`.harness/`)**:
   - Implement `check-protected-files.sh`: blocks unauthorized agent edits to `.golangci.yml`, `tsconfig.json`, `package.json`, `go.mod`, `go.work`, and `.harness/*`.
   - Implement `check-spec-scope.sh`: validates git diff against the active spec's `## Allowed files` section (or enforces ≤ 100 LOC for fast-path micro-fixes).
   - Implement `devin-pre-exec.sh` & `.devin/hooks.v1.json`: intercepts shell tool execution to block `git reset --hard`, `git push --force`, `pkill`, `killall`, and `--no-verify`.
   - Create root `verify.sh`: single Definition of Done running protected files check, spec scope check, Go test/lint suite, and Frontend test/lint suite. Expose via `make verify`.

3. **Curate & Streamline Agent Skills**:
   - Consolidate `.agents/skills/` to essential high-signal skills:
     - Core SDD: `spec-writer`, `fast-fix`, `tdd`, `diagnosing-bugs`, `review-diff`, `security-audit`, `codebase-design`.
     - Frontend / UI: `tastemaker`, `impeccable`, `emil-design-eng`, `apple-design`, `motion`, `ui-ux-pro-max`, `frontend-design`, `better-*` primitives.
   - Purge bloated duplicates and standalone manuals (`agent-skill-for-context-engineering` with 510 files, stale taste variants).

4. **Progressive Disclosure in `AGENTS.md` & Rules**:
   - Compress `AGENTS.md` to ≤ 12 KB with domain-targeted references.
   - Eliminate CI contradictions: establish `verify.sh` as the canonical local & CI verification command.
   - Scope context ingestion: Go backend tasks read Go architecture/standards; Frontend tasks read UI context.

---

## 3. Implementation Rules & Allowed Files

Touch **only** the following paths:
- `context/feature_specs/54_ai_harness_workflow_modernization.md`
- `context/progress_tracker.md`
- `context/archive/progress_tracker_history.md`
- `context/ai_workflow_rules.md`
- `AGENTS.md`
- `Makefile`
- `verify.sh`
- `.harness/**`
- `.devin/**`
- `.agents/skills/**`
- `context/archive/**`
- `ai-harness/**`
- `ai_agent_setup/**` (deletion)



---

## 4. Verification Checklist

1. `.harness/scripts/check-protected-files.sh` executes and passes cleanly.
2. `.harness/scripts/check-spec-scope.sh` executes and validates Spec 54 scope.
3. `AGENTS.md` is strictly under 14 KiB.
4. `ai_agent_setup/` is completely purged from repository.
5. `context/progress_tracker.md` is under 100 lines.
6. `make test` / Go unit tests pass cleanly across all microservices.
7. `npm test -- --watchAll=false` passes cleanly in `substreamedu-frontend`.
