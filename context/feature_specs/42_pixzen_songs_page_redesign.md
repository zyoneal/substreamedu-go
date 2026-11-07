# Spec 42: Pixzen Monochrome Editorial Redesign — Phase 6 (`SongSearchPlayer` / `/songs`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-112
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video/demo workspace (Spec 39), dashboard (Spec 40), and text studio (Spec 41), the `/songs` (and `/songs-demo`) page rendered by `SongSearchPlayer.tsx` still uses dark-mode fallback surfaces (`rgba(255, 255, 255, 0.032)`), `#242220` active CEFR level buttons, yellow `#faf92f` focus rings and text selections, `#ffffff` highlighted vocabulary words (invisible on `#F5F3EF` / `#EAE7E1`), `#1a1917` word tooltips, circular `.clearButton` in `SongSearchBar.module.css`, and `any` types in `SongSearchPlayer.tsx`.

This specification scopes the Pixzen Monochrome Editorial transformation to `SongSearchPlayer` (`/songs`), `SongSearchBar`, and `SongSearchResults`.

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`SongSearchPlayer.tsx`, `SongSearchBar.tsx`, `SongSearchResults.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme` in `SongSearchPlayer.tsx` so `body.pixzen` is active on `/songs` and `/songs-demo`.
   - Render `<div className="pixzenGrain" aria-hidden="true" />` inside `.container`.
   - Replace all `any` types in `SongSearchPlayer.tsx` with explicit TypeScript interfaces (`RawSongDictionaryItem`, `MutationError`), replace inline hex styles in the language overlay modal with semantic CSS module classes, and import `lucide-react` icons from the package root for Jest compatibility.
2. **Editorial Song Search Bar (`SongSearchBar.module.css`)**:
   - Soft-gray `#EAE7E1` outer bar with `1px solid rgba(10, 10, 10, 0.12)` border and `#F5F3EF` inner input pill (turning `#FFFFFF` with `#0A0A0A` border on `:focus-within`).
   - Frameless, circle-free `.clearButton` (`background: transparent; border: none; border-radius: 0; color: #8e8e8e`, hover `#0a0a0a` with `transform: rotate(90deg)`).
   - Pure black `#0A0A0A` pill `.searchButton` with `#F5F3EF` uppercase `tracking-widest` text.
3. **Editorial Search Results (`SongSearchResults.module.css`)**:
   - `#EAE7E1` container card (`1px solid rgba(10, 10, 10, 0.12)`) with `Satoshi` heading and uppercase `tracking-widest` track count.
   - `#F5F3EF` song result cards hovering to `#FFFFFF` with `rgba(10, 10, 10, 0.24)` border and `#0A0A0A` active border, plus `#0A0A0A` play badge overlay.
4. **Active Song Workspace, Lyrics Studio & Recommended Bento (`SongSearchPlayer.module.css`)**:
   - **Canvas & Header**: Warm-white `#F5F3EF` background, `#0A0A0A` ink, `Satoshi` display heading (`font-weight: 700`, `letter-spacing: -0.032em`), and bottom hairline separator (`1px solid rgba(10, 10, 10, 0.12)`).
   - **Track Info & Lyrics Studio (`.trackInfoCard`, `.lyricsCard`)**:
     - `#EAE7E1` cards with `1px solid rgba(10, 10, 10, 0.12)` borders, `#F5F3EF` `.playerNotice` pill, and `Satoshi` `17px` lyrics prose (`#0A0A0A`).
     - High-contrast `.highlightedText` (`color: #0a0a0a`, `background: rgba(10, 10, 10, 0.06)`, `border-bottom: 1.5px dashed rgba(10, 10, 10, 0.45)`, hovering to `#0A0A0A` bg with `#F5F3EF` text) and `.wordTooltip` (`#0A0A0A` pill with `#F5F3EF` text).
   - **Recommended Songs by CEFR Level (`.recommendedSection`)**:
     - `#EAE7E1` bento container with segmented CEFR `.levelSelectorRow` (`#F5F3EF` track, `#0A0A0A` active pill with `#F5F3EF` text, zero `#faf92f` focus rings).
     - 4-column `#F5F3EF` `.songItemCard` grid hovering to `#FFFFFF` with `#0A0A0A` inverting `.songIconBox`.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/42_pixzen_songs_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.module.css`
- `substreamedu-frontend/src/components/SongsPage/SongSearchBar.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchBar.module.css`
- `substreamedu-frontend/src/components/SongsPage/SongSearchResults.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchResults.module.css`
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.test.tsx`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/SongsPage/SongSearchPlayer.tsx src/components/SongsPage/SongSearchBar.tsx src/components/SongsPage/SongSearchResults.tsx src/components/SongsPage/SongSearchPlayer.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/SongsPage` — all tests pass.
