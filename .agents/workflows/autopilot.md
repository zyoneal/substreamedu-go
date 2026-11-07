# /autopilot Workflow

End-to-end development framework from `nick-vels/skills` (`v2.2.1`) that drives a feature or project from brief to verified delivery with a live dashboard (`.autopilot/dashboard.html`).

Usage:
`/autopilot [full|semi|interview|manual] [strict|deep] <описание задачи или путь к brief.md>`

Phases & Gates:
1. **0 Preflight (`phases/0-preflight.md`)**: Configure `.autopilot/`, verify `AGENTS.md` / `CLAUDE.md` memory markers, and start live dashboard via `python3 .autopilot/ap.py`.
2. **1 Manifest (`phases/1-manifest.md`)**: Redact secrets and atomise user brief into verbatim numbered requirements (`R01`, `R02`...) in `manifest.md`.
3. **2 Briefing (`phases/2-briefing.md`)**: Resolve genuine forks in rounds (`Gate G1`: zero unresolved `open` requirements).
4. **3 Spec (`phases/3-spec.md`)**: Explore codebase (`notes.md`), deepen edge cases (`R##.n`), define module seams in `interfaces.md`, and run independent coverage check (`Gate G2`).
5. **4 Plan (`phases/4-plan.md`)**: Slice into wave-ordered tickets (`tickets/NN-*.md`) and verify 100% requirement-to-ticket traceability via `python3 .autopilot/ap.py check-plan` (`Gate G3`).
6. **5 Build (`phases/5-subagents.md`)**: Execute tickets on clean seams with `REDPROOF` TDD and `./verify.sh`.
7. **6 Review (`phases/6-review.md`)**: Three-axis review (`Manifest` · `Spec` · `Craft`) + security checklist (`prompts/review.md`).
8. **8 Final & 9 Memory (`phases/8-final.md`, `phases/9-memory.md`)**: Blind acceptance against original brief (`Gate G4`), update `AGENTS.md`, `CONTEXT.md`, `docs/adr/`, and `.autopilot/PROGRESS.md`.

