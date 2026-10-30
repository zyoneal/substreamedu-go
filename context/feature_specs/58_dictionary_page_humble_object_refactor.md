# Spec 58: Dictionary Page Humble Object & SRP Refactoring (ub-mode)

- **Status**: Draft / In Progress
- **Owner**: Frontend Client (`substreamedu-frontend`)
- **Related ADR**: ADR-133
- **Depends On**: Spec 32 (`32_dictionary_page_apple_minimalist_redesign.md`), Spec 46 (`46_pixzen_dictionary_page_redesign.md`)

---

## 1. Problem Statement

`DictionaryPage.tsx` is 1355 lines long, violating Uncle Bob's **Single Responsibility Principle (SRP)**, **Boundary Discipline**, and frontend standards (`context/code_standards.md` §2.2). It mixes server-state fetching, debounced search filtering, view pagination, source category classification, edit word modal, and AI categorization modal directly into a single massive component.

### Evidence (verified in code)

| # | Concern | Location in `DictionaryPage.tsx` | Issues |
|---|---------|-----------------------------------|--------|
| E1 | Pure string parsing, icon mappings & categorization | Lines 64–125 | Mixed into the component file without dedicated unit tests |
| E2 | Multi-mode data fetching & mutation orchestration | Lines 199–280, 282–355 | Resources, categories, words, and categoryWords queries bundled together |
| E3 | Search debouncing & pagination calculation | Lines 151–164, 182–197, 360–420 | Tangled with UI rendering logic |
| E4 | Edit Word & AI Categorization modal rendering | Lines 1170–1340 | Large embedded JSX dialogs inflating the component |

---

## 2. Requirements

1. **R1: Pure Dictionary Utilities (`utils/dictionaryUtils.ts`)**:
   - Extract `escapeRegExp`, `getHighlightedParts`, `getSourceType`, `getSourceIcon`, and category grouping into `src/components/DictionaryPage/utils/dictionaryUtils.ts`.
   - Add deterministic unit tests in `dictionaryUtils.test.ts`.
2. **R2: Domain Data Hook (`hooks/useDictionaryData.ts`)**:
   - Encapsulate server state for resources, categories, allWords, and categoryWords.
   - Provide clean action handlers: `handleDeleteResource`, `handleDeleteWord`, `handleUpdateWord`, `handleExport`, and categorization actions.
3. **R3: Search & Pagination Hook (`hooks/useDictionarySearchPagination.ts`)**:
   - Encapsulate debounced query, active view mode, layout, current page, and slice computation.
4. **R4: Modal Subcomponents (`components/DictionaryModals.tsx`)**:
   - Extract `EditWordModal` and `CategorizeModal` into clean subcomponents.
5. **R5: Thin View Coordinator (`DictionaryPage.tsx`)**:
   - Reduce `DictionaryPage.tsx` from 1355 lines to <450 lines.
   - Preserve 100% existing functionality, design tokens, and tests.

---

## 3. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `.agents/skills/ub-mode/**`
- `.agents/workflows/ub-mode.md`
- `substreamedu-frontend/src/utils/textUtils*`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/VideoPage/VideoPage.tsx`
- `substreamedu-frontend/src/components/LearningPage/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/DictionaryPage/**`

---

## 4. Verification Checklist

1. Unit tests for `dictionaryUtils.test.ts` pass cleanly.
2. All tests in `DictionaryPage.test.tsx` pass without regression.
3. `DictionaryPage.tsx` line count reduced dramatically.
4. `check-spec-scope.sh` verifies within boundary.
5. `./verify.sh` passes end-to-end.
