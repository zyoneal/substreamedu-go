# Feature Spec 66: Homepage Multi-Skill Audit, Polish & Humble Object Architecture

## 1. Objective & Context
Following a comprehensive audit of the Homepage (`HomePage.tsx`, `HeroCinemaPlayer.tsx`, `HomePage.module.css`, `HeroCinemaPlayer.module.css`) across all installed AI & design engineering skills (`autopilot`, `ub-mode`, `react-conventions`, `emil-design-eng`, `landing-page-design`, `unslop`, `perception-laws`, `better-accessibility`, `better-typography`), this spec delivers:

1. **Humble Object & SRP Decomposition (`ub-mode`, `react-conventions`, `code_standards.md` §2.2)**:
   - Decomposes the 1,074-line `HomePage.tsx` monolith into focused modules under 250 lines:
     - `homePageData.tsx` (domain data, features, JSON-LD schemas, FAQ items builder)
     - `HomeInteractiveDemoSection.tsx` (Active Listening & phrase selection comparison sandbox)
     - `HomePricingSection.tsx` (Free, Premium, Lifetime tiers & Teacher promo)
     - `HomeReviewsFaqSection.tsx` (Social proof reviews, accessible FAQ accordion, Final CTA)
     - `HomeDemoModal.tsx` (Video walkthrough modal with ref playback lifecycle)
     - `HomePage.tsx` (Clean <200-line Humble Object coordinator)
2. **Design Engineering & Micro-Interaction Polish (`emil-design-eng`, `animate`, `better-accessibility`, `better-typography`)**:
   - Eliminates `transition: all` in `HeroCinemaPlayer.module.css` in favor of explicit property transitions with custom `cubic-bezier(0.23, 1, 0.32, 1)` ease-out.
   - Adds tactile `:active { transform: scale(0.97) }` press feedback and `:focus-visible` accessibility rings across all player controls and tabs.
   - Sets `transform-origin: bottom center` on `.popover` so the translation card scales directly from its subtitle trigger.
   - Gates hover transforms behind `@media (hover: hover) and (pointer: fine)` to prevent sticky hover artifacts on touch devices.
   - Applies `var(--font-mono, 'JetBrains Mono', monospace)` and `font-variant-numeric: tabular-nums` to player timecodes.
   - Makes all `HeroCinemaPlayer` controls genuinely interactive: wires up the Grammar Spotlight button (`Sparkles` toggles the CEFR grammar badge above the subtitle) and `3x` Repeat pill (`aria-pressed` toggle), plus keyboard (`Enter`/`Space`) support on blurred subtitles.
3. **Conversion, Copywriting & Token Hygiene (`landing-page-design`, `unslop`, `ui_context.md`)**:
   - Fixes `.btnPrimary` and `.demoCtaButton:hover` text color token (`var(--black, #f5f3ef)` instead of `--color-canvas`) to guarantee high-contrast text on `#0a0a0a` buttons before/outside `body.pixzen` mount.
   - Adds Graded Books (`/books`) to the interactive demo dock (`hero-demo-dock`) and sources marquee so all 4 core verticals (Movies, Synced Lyrics, Graded Books, AI Stories) are discoverable from the homepage.
   - Applies `unslop` copy refinements (removes exclamation marks and round placeholder numbers in social proof).

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Only tweak CSS rules in `HomePage.module.css` and leave `HomePage.tsx` at 1,074 lines | Violates `code_standards.md` §2.2 (250-line component limit) and leaves dead un-wired controls in `HeroCinemaPlayer`. Rejected. |
| B | Rewrite `HomePage` from scratch with a new theme | Breaks existing Pixzen editorial visual identity, routes, and user familiarity. Rejected. |
| C | Decompose `HomePage.tsx` into clean Humble Object subcomponents, wire interactive Grammar & 3x Repeat controls in `HeroCinemaPlayer`, apply `emil-design-eng` motion/accessibility polish, and verify via TDD | Preserves 100% visual identity while achieving <250 LOC per file, zero dead controls, hardware-accelerated transitions, and full test coverage. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/66_homepage_perfection_and_humble_object.md`
- `context/feature_specs/65_autopilot_skill_and_project_integration.md`
- `context/progress_tracker.md`
- `.agents/skills/autopilot/**`
- `.agents/workflows/autopilot.md`
- `skills-lock.json`
- `AGENTS.md`
- `CLAUDE.md`
- `CONTEXT.md`
- `context.md`
- `.autopilot/**`
- `substreamedu-frontend/src/components/HomePage/**`

## 4. Verification Checklist
- [ ] `REDPROOF` confirmed on new `HomePage.test.tsx` unit tests before implementation.
- [ ] `HomePage.tsx` reduced from 1,074 lines to < 250 lines.
- [ ] `npm test -- --watchAll=false src/components/HomePage/HomePage.test.tsx` passes.
- [ ] Full `./verify.sh` passes cleanly.

