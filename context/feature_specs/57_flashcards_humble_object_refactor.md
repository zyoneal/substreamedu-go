# Spec 57: Flashcards Humble Object & SRP Refactoring (ub-mode)

- **Status**: Draft / In Progress
- **Owner**: Frontend Client (`substreamedu-frontend`)
- **Related ADR**: ADR-132
- **Depends On**: Spec 56 (`56_learning_session_motivation.md`), Spec 47 (`47_pixzen_learning_page_redesign.md`)

---

## 1. Problem Statement

`Flashcards.tsx` has grown into a 999-line monolithic God Component violating Uncle Bob's **Single Responsibility Principle (SRP)**, **Boundary Discipline**, and the frontend's **Humble Object pattern** (`context/code_standards.md` §2.2: *"Components must not exceed 250 lines. Large UI pages must decompose into isolated subcomponents"*).

### Evidence (verified in code)

| # | Concern | Location in `Flashcards.tsx` | Issues |
|---|---------|-----------------------------|--------|
| E1 | Session state, persistence, restoration & optimistic mutations | Lines 63–79, 237–330, 352–446 | Monolithic `useState`/`useEffect` bundle intertwined with UI rendering |
| E2 | Global keyboard shortcuts handling | Lines 539–595 | 56-line `useEffect` with event listener directly inside component |
| E3 | Story highlight & tooltip DOM manipulation | Lines 117–229 | Raw string splicing, regex parsing, and window touch/mouse coordinates tracking |
| E4 | Audio gesture unlock & TTS autoplay timer | Lines 98–109, 522–536 | Timers and listeners mixed with card transitions |

---

## 2. Requirements

1. **R1: Humble Object Seam (`useFlashcardsSession`)**:
   - Extract session lifecycle, card queue management, rating dispatch, optimistic updates, and checkpoint logic into `src/components/LearningPage/hooks/useFlashcardsSession.ts`.
   - Provide clean, deterministic actions: `handleRating`, `revealNext`, `nextCard`, `prevCard`, `handleRefresh`, `handleFinishEarly`.
2. **R2: Keyboard Navigation Hook (`useFlashcardsKeyboard`)**:
   - Extract keyboard bindings (ArrowLeft, ArrowRight, Space/Enter, '1', '2') into `src/components/LearningPage/hooks/useFlashcardsKeyboard.ts`.
3. **R3: Pure Story Text Highlighting (`storyHighlightUtils`)**:
   - Move `highlightText` and `decodeHtmlEntities` into pure, independently testable functions in `src/components/LearningPage/utils/storyHighlightUtils.ts`.
4. **R4: Thin View Component (`Flashcards.tsx`)**:
   - Keep `Flashcards.tsx` focused strictly on layout, Framer Motion transitions, and presentation.
5. **R5: Zero Regressions**:
   - All 18 existing integration tests in `Flashcards.test.tsx` must pass without modifications to test expectations.
   - Add new targeted unit tests for the extracted hooks and utilities.

---

## 3. Design Alternatives (Design It Twice)

- **Alternative A (Redux/Zustand global store)**: Introduce external state management store for learning sessions.
  - *Rejected*: Overkill for a local session; adds unneeded dependencies and violates laziness protocol.
- **Alternative B (Decomposition into focused Custom Hooks & Pure Utilities)**: Extract `useFlashcardsSession` for state/actions, `useFlashcardsKeyboard` for event listeners, and pure utility `storyHighlightUtils.ts`.
  - *Selected*: Fully preserves existing contracts, strictly adheres to Humble Object and Uncle Bob's ub-mode, 100% testable in isolation.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `.agents/skills/ub-mode/**`
- `.agents/workflows/ub-mode.md`
- `substreamedu-frontend/src/utils/textUtils*`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/**`
- `substreamedu-frontend/src/components/VideoPage/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/LearningPage/**`

---

## 5. Verification Checklist

1. Unit tests for `storyHighlightUtils.test.ts` pass cleanly.
2. All 18 tests in `Flashcards.test.tsx` pass without regression.
3. Total lines in `Flashcards.tsx` reduced significantly (closer to 250-400 lines).
4. `check-spec-scope.sh` verifies within boundary.
5. `./verify.sh` passes end-to-end.
