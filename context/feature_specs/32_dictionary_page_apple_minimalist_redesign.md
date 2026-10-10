# Feature Spec 32: Dictionary Page Apple-Minimalist Widescreen Redesign

## 1. Objective
Redesign `/dictionary` (`DictionaryPage.tsx` and `DictionaryPage.module.css`) to match the Apple-minimalist widescreen Warm Espresso aesthetic established on `/dashboard` (Spec 31 / ADR-101):
1. **Widescreen Viewport Expansion (`1560px`)**: Expand `.contentWrapper` from `1180px` to `1560px` (`padding: 84px 48px 48px`) and make the main content area flex-fill the viewport height so there are no wide empty black margins on the sides or bottom of `1920x1080` desktop screens.
2. **Apple-Minimalist Top Bar**: Replace the centered italic yellow title with a clean left-aligned header bar pairing the page title (`My dictionary`) with the segmented view switcher (`Collections`, `Themes`, `All Words`) and `Export to Anki` action.
3. **Calm Telemetry Cards**: Redesign the 3 top summary cards (`Total Vocabulary Words`, `Mastered in Memory`, `Active Collections`) to use the same clean label + `16px` icon header and large `40px` tabular metric + quiet inline subtext as `/dashboard`, removing the multi-colored Tailwind pill badges (`SAVED`, `SOURCES`) and bulky `48x48px` icon boxes.
4. **Purge Technical Bracket Tags**: Replace bracketed monospace tags (`[ALL]`, `[YOUTUBE]`, `[MOVIES]`, `[TEXTS]`, `[LYRICS]`) and uppercase `"VOCABULARY PREVIEW"` labels with human-readable filter pills (`All`, `YouTube`, `Movies`, `Texts`, `Lyrics`) and inline icon squircles (`42x42px`) + title headers inside collection cards.

---

## 2. Implementation Rules & Strict File Boundaries
Touch **only** the following files:
1. `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
2. `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`
3. `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.test.tsx`
4. `context/feature_specs/32_dictionary_page_apple_minimalist_redesign.md`
5. `context/progress_tracker.md`

---

## 3. Verification Checklist
- [ ] `npx jest src/components/DictionaryPage/DictionaryPage.test.tsx --watchAll=false` passes with 0 errors.
- [ ] Production build (`npx react-app-rewired build`) succeeds with exit code 0.
