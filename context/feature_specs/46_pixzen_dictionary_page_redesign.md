# Spec 46: Pixzen Monochrome Editorial Redesign — Phase 10 (`DictionaryPage` / `/dictionary`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-116
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`), Spec 42 (`42_pixzen_songs_page_redesign.md`), Spec 43 (`43_pixzen_subtitles_page_redesign.md`), Spec 44 (`44_pixzen_subscribe_page_redesign.md`), Spec 45 (`45_pixzen_telegram_bot_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video workspace (Spec 39), dashboard (Spec 40), text studio (Spec 41), songs studio (Spec 42), subtitles pages (Spec 43), subscribe page (Spec 44), and Telegram bot page (Spec 45), the `/dictionary` and `/dictionary-demo` page (`DictionaryPage.tsx`) still relies on dark-mode CSS variables (`--bg-page: #0d0c0b`, `--card-bg: rgba(255, 255, 255, 0.032)`, `--card-border: rgba(255, 255, 255, 0.065)`, `--accent-yellow: #faf92f`), legacy ambient glow nodes, low-contrast text styles designed for dark backgrounds, and lacks the scoped `usePixzenTheme()` hook and film-grain overlay.

This specification scopes the Pixzen Monochrome Editorial transformation to `DictionaryPage` (`/dictionary`, `/dictionary-demo`).

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`DictionaryPage.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme`.
   - Render `<div className="pixzenGrain" aria-hidden="true" />` at the root of `styles.dictionaryContainer`.
   - Remove legacy `.ambientGlow` nodes.
   - Clean up remaining `any` types in `DictionaryPage.tsx`.
2. **Editorial Widescreen Canvas & Header (`DictionaryPage.module.css`)**:
   - Canvas: `#F5F3EF` warm-white background, `#0A0A0A` primary ink, `Satoshi` typography.
   - Title: `Satoshi`, `font-weight: 700`, `letter-spacing: -0.032em`, `#0A0A0A`.
   - View mode switcher (`segmentedControl`): `#EAE7E1` pill container (`border: 1px solid rgba(10, 10, 10, 0.12)`), `#0A0A0A` active pill with `#F5F3EF` text.
   - Export button: `#0A0A0A` primary pill button (`color: #F5F3EF`, uppercase `tracking-widest`, hover `#222222`, zero `#faf92f` yellow).
3. **Telemetry & Filter Bar**:
   - 3 Telemetry cards (`statsGrid`): `#EAE7E1` secondary editorial card surfaces (`border: 1px solid rgba(10, 10, 10, 0.12)`, `border-radius: 20px`), `#8E8E8E` uppercase `tracking-widest` labels, `Satoshi` `700` tabular numerals (`#0A0A0A`), and quiet subtext (`#4A4A48`).
   - Category filter pills: `#EAE7E1` / `#F5F3EF` pills with `1px solid rgba(10, 10, 10, 0.12)`, `#0A0A0A` active pill.
   - Search bar: `#F5F3EF` pill turning `#FFFFFF` with `#0A0A0A` border on focus, with frameless rotating `X` clear button.
4. **Collection & Word Cards**:
   - `.groupCard` / `.wordCard`: `#EAE7E1` card surfaces (`border: 1px solid rgba(10, 10, 10, 0.12)`, `border-radius: 20px`), elevating to `#FFFFFF` on hover.
   - Icon squircles: `#F5F3EF` background, turning `#0A0A0A` with `#F5F3EF` icon on card hover.
   - Context quote: `#F5F3EF` surface with `#0A0A0A` left border and high-contrast bold highlighted text.
   - Word edit modal: `#F5F3EF` surface, `#FFFFFF` inputs with `#0A0A0A` text, `#0A0A0A` primary save pill.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/46_pixzen_dictionary_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.test.tsx`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/DictionaryPage/DictionaryPage.tsx src/components/DictionaryPage/DictionaryPage.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/DictionaryPage` — all tests pass.
