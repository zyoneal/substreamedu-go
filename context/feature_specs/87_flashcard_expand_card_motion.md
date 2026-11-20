# Feature Spec 87: Spring-Animated Expand Card for SRS Flashcards

## Context & Objectives
The `/learning` flashcard (`Flashcard.tsx`) currently snaps abruptly from its front prompt (`Tap to reveal`) to the revealed back side without height or detail choreography. Replacing the static card container with a spring-animated `ExpandCard` component gives every reveal a smooth physical expansion while keeping the Pixzen monochrome editorial aesthetic (`#eae7e1`, `#0a0a0a`, `e-Ukraine`, `JetBrains Mono`, `20px` radius).

This spec delivers:
1. **Reusable Spring `ExpandCard` (`src/components/ui/ExpandCard.tsx`, `ExpandCard.module.css`, `ExpandCard.test.tsx`)**:
   - Rebuilt in React + TypeScript + CSS Modules using the exact dual-spring physics from `designbookmark.com/motion#db-expand-card`:
     - Expand progress spring `p`: `stiffness = 240`, `damping = 21`
     - Details reveal spring `a`: `stiffness = 260`, `damping = 28`, triggered after `160ms` (`0.16s`) delay on open
     - 4 physics substeps per animation frame; stops `requestAnimationFrame` once both springs settle
   - Dynamically measures collapsed and expanded content heights (with `ResizeObserver` support when available) so cards of any text/image length expand smoothly without clipping.
   - Respects `prefers-reduced-motion: reduce` (snaps immediately without overshoot or delay).
2. **Flashcard Integration (`Flashcard.tsx`, `Flashcard.module.css`)**:
   - Wraps the SRS flashcard front prompt and revealed answer inside `ExpandCard`, keeping `Tap to reveal`, keyboard support (`Enter`/`Space`), pronunciation button, YouGlish word click, personal notes, and broken image suppression intact.

## Allowed files
- `context/feature_specs/87_flashcard_expand_card_motion.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/ExpandCard.tsx`
- `substreamedu-frontend/src/components/ui/ExpandCard.module.css`
- `substreamedu-frontend/src/components/ui/ExpandCard.test.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.module.css`

## Acceptance Criteria
1. `ExpandCard` uses the exact `(240, 21)` progress spring, `(260, 28)` detail spring, and `160ms` detail reveal delay, animating card height and detail `opacity`/`translateY` smoothly and stopping `rAF` once settled.
2. `Flashcard` integrates `ExpandCard` while preserving `Tap to reveal`, keyboard reveal, pronunciation, YouGlish click, notes, and image error fallback.
3. `npx tsc --noEmit`, `eslint`, `ExpandCard.test.tsx`, `Flashcard.test.tsx`, `Flashcards.test.tsx`, and `typography.test.ts` pass cleanly.
