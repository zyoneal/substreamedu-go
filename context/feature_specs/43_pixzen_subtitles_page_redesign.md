# Spec 43: Pixzen Monochrome Editorial Redesign — Phase 7 (`SubtitlesPage` & `SubtitleViewer` / `/subtitles`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-113
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`), Spec 42 (`42_pixzen_songs_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video/demo workspace (Spec 39), dashboard (Spec 40), text studio (Spec 41), and songs studio (Spec 42), the `/subtitles` (and `/subtitles-demo`) catalog page (`SubtitlesPage.tsx`) and `/subtitles/:fileId` reader page (`SubtitleViewer.tsx`) still use the legacy darkroom theme (`#141312` surfaces, `#282522` borders, `06 // SUBTITLES` / `06 // SUBTITLE VIEWER` technical tags, yellow `#faf92f` `<do>` title highlights and button hovers, narrow `800px`/`900px` containers, `#ffffff` highlighted vocabulary words invisible on light backgrounds, `any` types in `SubtitleViewer.tsx`, and ~350 lines of dead `.glass3d`/`.popover` CSS in `SubtitleViewer.module.css`).

This specification scopes the Pixzen Monochrome Editorial transformation to `SubtitlesPage` (`/subtitles`, `/subtitles-demo`) and `SubtitleViewer` (`/subtitles/:fileId`).

---

## 2. Visual & Interactive Requirements

1. **Subtitles Catalog (`SubtitlesPage.tsx` + `SubtitlesPage.module.css`)**:
   - Activate `usePixzenTheme()` and render `<div className="pixzenGrain" aria-hidden="true" />` inside `.container` (`max-width: 1560px; padding: 92px 48px 44px; min-height: 100dvh; background: #f5f3ef;`).
   - Replace centered `06 // SUBTITLES` eyebrow and yellow `<do>Subtitles</do>` highlight with a left-aligned `.topBar` (`Satoshi`, `700`, `-0.032em` title + `.countBadge` pill).
   - Redesign `.toolbar` as a full-width `#EAE7E1` bar (`1px solid rgba(10, 10, 10, 0.12)`) with a `#F5F3EF` pill `.searchInputWrapper` (turning `#FFFFFF` with `#0A0A0A` border on focus), frameless rotating `X` `.clearButton`, and `#0A0A0A` primary pill `.uploadButton` (`#F5F3EF` uppercase `tracking-widest` text, no yellow `#faf92f` hover).
   - Redesign `.subtitlesWrapper` as a `#EAE7E1` bento surface containing a 3-column grid of `#F5F3EF` `.subtitleCard` items (hovering to `#FFFFFF` with `#0A0A0A` inverting `.subtitleIconBox` squircle and clean delete button).
2. **Subtitle Reader (`SubtitleViewer.tsx` + `SubtitleViewer.module.css`)**:
   - Activate `usePixzenTheme()` and render `<div className="pixzenGrain" aria-hidden="true" />` inside `.container` (`max-width: 1560px`).
   - Replace `06 // SUBTITLE VIEWER` with a `.topBar` featuring a `← Back to Subtitles` pill link, `Satoshi` `700` file title, and line count badge.
   - Style `.subtitlesList` as a `#EAE7E1` editorial reading card (`18px` `Satoshi` prose, `#0A0A0A` ink), with high-contrast `.highlightedText` (`color: #0a0a0a`, `background: rgba(10, 10, 10, 0.06)`, `border-bottom: 1.5px dashed rgba(10, 10, 10, 0.45)`, hovering to `#0A0A0A` bg + `#F5F3EF` text) and `#0A0A0A` pill `.wordTooltip`.
   - Eliminate all `any` types (`RawSubtitleDictionaryItem`, `DocumentWithCaretPosition`, `MutationError`), replace inline `#FAF92F` modal button styles with semantic CSS module classes, and purge dead `.glass3d`/`.popover` styles from `SubtitleViewer.module.css`.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/43_pixzen_subtitles_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/SubtitlesPage/SubtitlesPage.tsx`
- `substreamedu-frontend/src/components/SubtitlesPage/css/SubtitlesPage.module.css`
- `substreamedu-frontend/src/components/SubtitlesPage/SubtitlesPage.test.tsx`
- `substreamedu-frontend/src/components/SubtitleViewer/SubtitleViewer.tsx`
- `substreamedu-frontend/src/components/SubtitleViewer/css/SubtitleViewer.module.css`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/SubtitlesPage/SubtitlesPage.tsx src/components/SubtitlesPage/SubtitlesPage.test.tsx src/components/SubtitleViewer/SubtitleViewer.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/SubtitlesPage` — all tests pass.
