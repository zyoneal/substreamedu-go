# Feature Spec 88: Spring-Animated Swipe Deck for `/learning` SRS Flashcards

## Context & Objectives
On `/learning`, flashcards currently transition one at a time via a simple horizontal fade without tactile drag-to-rate or visual deck depth. Integrating a spring-animated `SwipeDeck` lets learners physically swipe revealed cards right (**Good**) or left (**Again**) with live directional stamps, grab-point rotation, and stacked upcoming cards rising smoothly underneath.

This spec delivers:
1. **Reusable Spring `SwipeDeck` (`src/components/ui/SwipeDeck.tsx`, `SwipeDeck.module.css`, `SwipeDeck.test.tsx`)**:
   - Rebuilt in React + TypeScript + CSS Modules using the exact spring parameters from `designbookmark.com/motion#db-swipe-deck` (`tokens.css` & `deck.js`):
     - Drag spring: `stiffness = 900`, `damping = 50` (`--deck-drag`)
     - Return spring: `stiffness = 280`, `damping = 16` (`--deck-return`)
     - Depth stack spring: `stiffness = 260`, `damping = 22`
     - Fling spring: `stiffness = 70`, `damping = 17`
     - Decision threshold: `110px` (`--deck-threshold`), flick velocity `700 px/s`, 4 substeps per frame
   - Grab-point rotation (`0.065 deg/px * grabSign`), directional `GOOD` / `AGAIN` stamps, stacked upcoming card layers rising with drag progress, and `prefers-reduced-motion: reduce` support.
   - Styled with SubStreamEdu Pixzen monochrome editorial tokens (`#eae7e1`, `#0a0a0a`, `--color-success`, `e-Ukraine`, `20px` radius).
2. **`Flashcards.tsx` Integration**:
   - Wraps the active `Flashcard` (`ExpandCard`) in `SwipeDeck`, showing up to 2 stacked upcoming cards behind it.
   - Enables drag-to-rate once the card is revealed (`revealLevel >= 1 && !isCardInFlight`) so tapping to reveal or clicking pronunciation/word links never misfires.
   - Connects **Again** / **Good** rating buttons to `SwipeDeck` fling animation while advancing SRS state immediately.

## Allowed files
- `context/feature_specs/88_learning_swipe_deck.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/SwipeDeck.tsx`
- `substreamedu-frontend/src/components/ui/SwipeDeck.module.css`
- `substreamedu-frontend/src/components/ui/SwipeDeck.test.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`

## Acceptance Criteria
1. `SwipeDeck` preserves the exact `(900, 50)`, `(280, 16)`, `(260, 22)`, `(70, 17)` springs and `110px` threshold, and stops `rAF` once settled.
2. Dragging right/left past `110px` invokes `onSwipeRight` / `onSwipeLeft`; releasing below threshold springs back cleanly without rating.
3. Unrevealed cards (`canSwipe={false}`) do not trigger swipe ratings while stacked depth cards remain visible.
4. `npx tsc --noEmit`, `eslint`, `SwipeDeck.test.tsx`, `Flashcards.test.tsx`, `Flashcard.test.tsx`, and `typography.test.ts` pass cleanly.
