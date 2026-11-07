# Feature Spec 69: Dictionary Collection Page (`/dictionary/resources/:resourceName`) Pixzen Light Editorial Redesign & Humble Object Architecture

## 1. Objective & Context
Redesign the Dictionary Collection page (`DictionaryItemsPage.tsx` and `DictionaryItemsPage.module.css` at `/dictionary/resources/:resourceName`) from the legacy dark theme (`#0a0a0a` / `#111111` backgrounds, `#e8e8e8` text, unmounted `usePixzenTheme()`) to the unified **Pixzen Monochrome Editorial** light design system used on `HomePage`, `DashboardPage`, `DictionaryPage`, `LearningPage`, and `BooksCatalogPage`, and decompose the 564-line monolithic component into a clean Humble Object (<250 lines).

Key issues identified from the user's screenshot and audit (`impeccable`, `emil-design-eng`, `react-conventions`, `ub-mode`):
1. **Missing `usePixzenTheme()` & `.pixzenGrain`**:
   - `DictionaryItemsPage.tsx` did not call `usePixzenTheme()`, leaving `document.body` without the `pixzen` class and causing both the top `Header` and the page background to render in the legacy dark theme.
2. **Legacy Dark Styles in `DictionaryItemsPage.module.css`**:
   - Hardcoded `#0a0a0a` header strip, `#111111` flashcard and list item surfaces, `#2a2a2a` borders, and `#e8e8e8` white text conflicted with the light Pixzen editorial palette (`#f5f3ef` canvas, `#eae7e1` soft-stone cards, `#0a0a0a` primary ink, `#4a4a48` secondary text, `#8e8e8e` muted metadata, `rgba(10, 10, 10, 0.12)` hairline borders).
3. **Humble Object Violation (`code_standards.md` §2.2)**:
   - `DictionaryItemsPage.tsx` was 564 lines, mixing cursor pagination, infinite scroll `IntersectionObserver`, full-deck shuffle fetching, keyboard/touch gesture navigation, Anki blob export, and item deletion with presentation JSX.

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Only add `usePixzenTheme()` in `DictionaryItemsPage.tsx` and invert a few hex colors in CSS | Leaves the 564-line monolithic component intact and keeps legacy boxy dark-mode borders/buttons that do not match `HomePage` or `DictionaryPage`. Rejected. |
| B | Full Pixzen Monochrome Editorial redesign of `DictionaryItemsPage.module.css` (`#f5f3ef` page, `#eae7e1` 24px soft-stone 3D flip card and 16px term cards, pill `Anki Export` CTA, tactile circle controls, `@media (hover: hover)` and `prefers-reduced-motion` support) + extract `useDictionaryItemsSession.ts` hook so `DictionaryItemsPage.tsx` is a <250-line Humble Object with unit tests | Matches `HomePage` and `DictionaryPage` aesthetics and satisfies all architectural standards. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/69_dictionary_items_pixzen_editorial_redesign.md`
- `context/progress_tracker.md`
- `.autopilot/PROGRESS.md`
- `substreamedu-frontend/src/components/DictionaryItemsPage/**`

## 4. Verification Checklist
- [x] `DictionaryItemsPage.tsx` activates `usePixzenTheme()`, renders `.pixzenGrain`, and is ≤ 250 lines (Humble Object).
- [x] `DictionaryItemsPage.module.css` uses the Pixzen monochrome editorial light palette (`#f5f3ef` canvas, `#eae7e1` cards, `#0a0a0a` ink, `#4a4a48` secondary, `#8e8e8e` mono metadata) with `@media (hover: hover) and (pointer: fine)` and `@media (prefers-reduced-motion: reduce)`.
- [x] Unit tests in `DictionaryItemsPage.test.tsx` verify light theme activation, flashcard rendering/flipping, term list rendering, and CSS tokens.
- [x] `./verify.sh` passes with 0 errors.
