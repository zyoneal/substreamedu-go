# Feature Spec 92: Top-Candidate Spring Motion Components (`StorageMeter`, `FileDropZone`, `StreamingText`, `FocusModeToggle`, `ReadAlongText`, `MorphPopover`)

## Context & Objectives
Building on Specs 86–91 (`ToggleSwitch`, `ExpandCard`, `SwipeDeck`, `DynamicText`, `PaginationDots`, `SegmentedControl`, `CopyButton`, `LoadingToSuccessButton`, `AnimatedStatValue`, `SpringDropdown`), this spec implements the high-impact "Top-Candidate" motion patterns from `designbookmark.com/motion`:

1. **`StorageMeter` (`src/components/ui/StorageMeter.tsx`, `.module.css`, `.test.tsx`)**:
   - Proportional multi-segment breakdown bar with staggered spring entrance (`scaleX`, GPU-accelerated), hover segment focus, `JetBrains Mono` `tabular-nums` legend, and `prefers-reduced-motion`.
   - Integrated into `DashboardTelemetryCards.tsx` (Dictionary Vault card: Mastered / In Progress / New) and `DictionaryPage.tsx` (below telemetry stats when `totalWordsCount > 0`).
2. **`FileDropZone` (`src/components/ui/FileDropZone.tsx`, `.module.css`, `.test.tsx`)**:
   - Tactile drag-and-drop upload surface with spring lift on drag-over, click/keyboard trigger, selected file confirmation chip, and `prefers-reduced-motion`.
   - Integrated into `DictionaryImportModal.tsx` (`.csv/.txt/.tsv`) and `BooksCatalogPage.tsx` (`.epub/.txt`).
3. **`StreamingText` (`src/components/ui/StreamingText.tsx`, `.module.css`, `.test.tsx`)**:
   - Smooth token-by-token reveal (`translateY(4px) -> 0`, `opacity: 0 -> 1`, capped total stagger `<= 420ms`, instant under `prefers-reduced-motion`).
   - Integrated into `TranslationPopover.tsx` for AI contextual translation and definition display.
4. **`MorphPopover` (`TranslationPopover.tsx`)**:
   - Upgrades `TranslationPopover` to spring-glide smoothly between words (`left`/`top` spring morph while already open) instead of abrupt teleporting, respecting `useReducedMotion()`.
5. **`FocusModeToggle` (`src/components/ui/FocusModeToggle.tsx`, `.module.css`, `.test.tsx`)**:
   - Spring-animated distraction-free reading toggle (`aria-pressed`, `Escape` exit, `prefers-reduced-motion`).
   - Integrated into `BookReaderPage.tsx`, `BookReaderHeader.tsx`, and `BookReader.module.css`.
6. **`ReadAlongText` (`src/components/ui/ReadAlongText.tsx`, `.module.css`, `.test.tsx`)**:
   - Reusable word-by-word synchronized reading highlight (`progress: 0..1` maps spoken/active/upcoming words with smooth opacity & ink transitions and `prefers-reduced-motion`).

## Allowed files
- `context/feature_specs/92_top_candidate_motion_components.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/StorageMeter.tsx`
- `substreamedu-frontend/src/components/ui/StorageMeter.module.css`
- `substreamedu-frontend/src/components/ui/StorageMeter.test.tsx`
- `substreamedu-frontend/src/components/ui/FileDropZone.tsx`
- `substreamedu-frontend/src/components/ui/FileDropZone.module.css`
- `substreamedu-frontend/src/components/ui/FileDropZone.test.tsx`
- `substreamedu-frontend/src/components/ui/StreamingText.tsx`
- `substreamedu-frontend/src/components/ui/StreamingText.module.css`
- `substreamedu-frontend/src/components/ui/StreamingText.test.tsx`
- `substreamedu-frontend/src/components/ui/FocusModeToggle.tsx`
- `substreamedu-frontend/src/components/ui/FocusModeToggle.module.css`
- `substreamedu-frontend/src/components/ui/FocusModeToggle.test.tsx`
- `substreamedu-frontend/src/components/ui/ReadAlongText.tsx`
- `substreamedu-frontend/src/components/ui/ReadAlongText.module.css`
- `substreamedu-frontend/src/components/ui/ReadAlongText.test.tsx`
- `substreamedu-frontend/src/components/DashboardPage/components/DashboardTelemetryCards.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/components/DictionaryImportModal.tsx`
- `substreamedu-frontend/src/components/BooksPage/BooksCatalogPage.tsx`
- `substreamedu-frontend/src/components/BooksPage/BookReaderPage.tsx`
- `substreamedu-frontend/src/components/BooksPage/components/BookReaderHeader.tsx`
- `substreamedu-frontend/src/components/BooksPage/css/BookReader.module.css`
- `substreamedu-frontend/src/components/shared/TranslationPopover.tsx`

## Acceptance Criteria
1. All 5 new reusable motion primitives have deterministic unit tests and honor `prefers-reduced-motion`.
2. `TranslationPopover` smoothly morphs position and reveals AI translations with `StreamingText`.
3. `BookReaderPage` supports toggling distraction-free Focus Mode and exiting via button or `Escape`.
4. `npx tsc --noEmit`, `eslint` on touched files, and full Jest test suite pass cleanly with zero regressions.
