# Spec 41: Pixzen Monochrome Editorial Redesign — Phase 5 (`TextPasteHighlighter` / `/text-paste`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-111
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video/demo workspace (Spec 39), and dashboard (Spec 40), the `/text-paste` (and `/texts-demo`) page rendered by `TextPasteHighlighter.tsx` still uses dark-mode fallback surfaces (`rgba(255, 255, 255, 0.032)`), `#242220` active level buttons, `#ffffff` dictionary word highlights (invisible on `#F5F3EF`), `#1a1917` word tooltips, and `any` types in `TextPasteHighlighter.tsx`. Additionally, `modal.module.css` (used by `TextPasteHighlighter` confirm modals) still has a `#faf92f` yellow hover on `.btnConfirmPrimary` and a bordered box hover on `.closeButton`, and `MobileHint.module.css` uses a dark `#121212` card.

This specification scopes the Pixzen Monochrome Editorial transformation to `TextPasteHighlighter` (`/text-paste`), `modal.module.css`, and `MobileHint.module.css`.

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`TextPasteHighlighter.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme` so `body.pixzen` is active on `/text-paste` and `/texts-demo`.
   - Render `<div className="pixzenGrain" aria-hidden="true" />` inside `.container`.
   - Replace all `any` types in `TextPasteHighlighter.tsx` with explicit TypeScript interfaces (`TextDictionaryItem`, `MutationError`).
2. **Editorial Text Studio (`TextPasteHighlighter.module.css`)**:
   - **Canvas & Header**: Warm-white `#F5F3EF` background, `#0A0A0A` ink, `Satoshi` display heading (`font-weight: 700`, `letter-spacing: -0.032em`), bottom hairline separator (`1px solid rgba(10, 10, 10, 0.12)`), and pill `.knownWordsBadge` (`#EAE7E1` surface, `#0A0A0A` dot and uppercase `tracking-widest` label).
   - **Unified AI & Action Control Bar (`.controlBar`)**:
     - Soft-gray `#EAE7E1` bar with `1px solid rgba(10, 10, 10, 0.12)`.
     - Pill `.topicInputWrapper` (`#F5F3EF` surface, `#0A0A0A` focus border).
     - Segmented CEFR `.levelButtons` (`#F5F3EF` track, `#0A0A0A` active pill with `#F5F3EF` text, no yellow focus ring).
     - Primary pill `.pasteButton` (`#0A0A0A` bg, `#F5F3EF` text, uppercase `tracking-widest`) and secondary pill `.trashButton` (`#F5F3EF` bg, `rgba(10, 10, 10, 0.12)` border).
   - **Reading Canvas (`.editorCard`) & Vocabulary Highlights (`.dictionaryWord`)**:
     - `#EAE7E1` reading card with `1px solid rgba(10, 10, 10, 0.12)`, `Satoshi` `18px` body text (`#0A0A0A`), `#8E8E8E` placeholder, and uppercase `tracking-widest` footer metrics.
     - High-contrast `.dictionaryWord` (`color: #0a0a0a`, `background: rgba(10, 10, 10, 0.06)`, `border-bottom: 1.5px dashed rgba(10, 10, 10, 0.45)`, hovering to `#0A0A0A` bg with `#F5F3EF` text) and `.wordTooltip` (`#0A0A0A` pill with `#F5F3EF` text).
     - Warm-white blurred `.generatingOverlay` (`rgba(245, 243, 239, 0.82)`).
3. **Shared Modal & Mobile Hint Polish (`modal.module.css`, `MobileHint.module.css`)**:
   - Update `modal.module.css` to `#F5F3EF` surface, `rgba(10, 10, 10, 0.12)` hairline borders, frameless rotating `X` `.closeButton`, and `#0A0A0A` → `#262626` `.btnConfirmPrimary` (purging `#faf92f`).
   - Update `MobileHint.module.css` to `#F5F3EF` card surface, `#0A0A0A` typography, and `#0A0A0A` pill close button.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/41_pixzen_text_paste_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.tsx`
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.module.css`
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.test.tsx`
- `substreamedu-frontend/src/components/ui/modal.module.css`
- `substreamedu-frontend/src/components/shared/MobileHint.module.css`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/TextPasteHighlighter/TextPasteHighlighter.tsx src/components/TextPasteHighlighter/TextPasteHighlighter.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/TextPasteHighlighter` — all tests pass.
