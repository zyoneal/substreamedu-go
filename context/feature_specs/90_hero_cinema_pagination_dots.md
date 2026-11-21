# Feature Spec 90: Spring-Animated Pagination Dots for HeroCinemaPlayer Showcase

## Context & Objectives
On the public homepage (`/`), `HeroCinemaPlayer` shows how learners highlight and save a phrase from blurred subtitles, but does not yet demonstrate the second half of the SubStreamEdu loop: reviewing that saved phrase as an FSRS spaced-repetition flashcard.

This spec delivers:
1. **Reusable Spring `PaginationDots` (`src/components/ui/PaginationDots.tsx`, `PaginationDots.module.css`, `PaginationDots.test.tsx`)**:
   - Rebuilt in React + TypeScript + CSS Modules using the exact spring parameters from `designbookmark.com/motion#db-pagination-dots` (`dots.js`, `dots.css`, `motion.js`):
     - Slide strip spring (`P`): `stiffness = 170`, `damping = 22`
     - Active droplet pill leading edge (`A` or `B`): `stiffness = 520`, `damping = 34`
     - Active droplet pill trailing edge (`B` or `A`): `stiffness = 140`, `damping = 18`
     - Geometry: `8px` dots, `14px` gap, `20px` active pill width, 4 substeps per frame, idle-stopped `rAF`, `prefers-reduced-motion` critical damping (`2 * Math.sqrt(k)`), and keyboard arrow navigation.
   - Styled with SubStreamEdu Pixzen monochrome editorial tokens (`#0a0a0a` active pill, `rgba(10, 10, 10, 0.18)` inactive dots, `e-Ukraine`, `JetBrains Mono` step label).
2. **`HeroCinemaPlayer` Two-Step Learning Loop Showcase (`HeroCinemaPlayer.tsx`, `HeroCinemaPlayer.module.css`)**:
   - Slide 1 (**Highlight & save**): Existing interactive 16:9 *Interstellar* blurred-subtitle preview with `no problem` contextual translation popover and `SAVE` button.
   - Slide 2 (**Review as flashcard**): Matching 16:9 interactive FSRS flashcard stage for the exact saved phrase (`no problem` → `без проблем`), with scene context, tap-to-reveal answer, and interactive `Again · 10m` / `Good · 3d` rating feedback.

## Allowed files
- `context/feature_specs/90_hero_cinema_pagination_dots.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/PaginationDots.tsx`
- `substreamedu-frontend/src/components/ui/PaginationDots.module.css`
- `substreamedu-frontend/src/components/ui/PaginationDots.test.tsx`
- `substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.tsx`
- `substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.module.css`
- `substreamedu-frontend/src/components/HomePage/HomePage.test.tsx`

## Acceptance Criteria
1. `PaginationDots` preserves the exact `(170, 22)` strip spring, `(520, 34)` leading-edge spring, `(140, 18)` trailing-edge spring, 4 substeps per frame, and stops `rAF` once settled.
2. Clicking a pagination dot glides `HeroCinemaPlayer` between Slide 1 (Watch & Save) and Slide 2 (FSRS Flashcard Review), where learners can reveal and rate the saved card.
3. `npx tsc --noEmit`, `eslint`, `PaginationDots.test.tsx`, `HomePage.test.tsx`, and `typography.test.ts` pass cleanly.
