# Spec 47: Pixzen Monochrome Editorial Redesign — Phase 11 (`LearningPage` / `/learning`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-117
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`), Spec 42 (`42_pixzen_songs_page_redesign.md`), Spec 43 (`43_pixzen_subtitles_page_redesign.md`), Spec 44 (`44_pixzen_subscribe_page_redesign.md`), Spec 45 (`45_pixzen_telegram_bot_page_redesign.md`), Spec 46 (`46_pixzen_dictionary_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video workspace (Spec 39), dashboard (Spec 40), text studio (Spec 41), songs studio (Spec 42), subtitles pages (Spec 43), subscribe page (Spec 44), Telegram bot page (Spec 45), and dictionary page (Spec 46), the `/learning` (and `/review-demo`) SRS practice page (`LearningPage.tsx`, `Flashcards.tsx`, `Flashcard.tsx`, `ActivePractice.tsx`) still relies on darkroom styling (`min-height: calc(100vh - 140px)`, `background: transparent`, `rgba(255, 255, 255, 0.02)` cards, hardcoded dark CSS variables `--black: #0d0c0b; --cream: #ede8e0; --accent: #faf92f`), neon yellow accents on hover and rating buttons, and lacks the scoped `usePixzenTheme()` hook and film-grain overlay.

This specification scopes the Pixzen Monochrome Editorial transformation to `LearningPage` (`/learning`, `/review-demo`).

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`LearningPage.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme`.
   - Render `<div className="pixzenGrain" aria-hidden="true" />` at the root of `LearningPage.tsx`.
   - Canvas background: `#F5F3EF` warm-white, `#0A0A0A` ink, `Satoshi` typography.
2. **Editorial Flashcard Arena (`Flashcard.tsx` + `Flashcard.module.css`)**:
   - `.ankiCard`: `#EAE7E1` secondary editorial card surface (`border: 1px solid rgba(10, 10, 10, 0.12)`, `border-radius: 20px`, padding `32px 36px`, min-height `260px`).
   - Word: `Satoshi` `700`, `clamp(32px, 5vw, 44px)`, `-0.032em`, `#0A0A0A` color.
   - Definition: `Satoshi` `500`, `24px`, `#4A4A48`.
   - Transcription: `JetBrains Mono`, `13px`, `#8E8E8E`.
   - Context snippet / Hints: `#F5F3EF` container, `#4A4A48` text with high-contrast `#0A0A0A` bold keyword.
   - Pronunciation button: `#F5F3EF` circular button with `1px solid rgba(10, 10, 10, 0.12)`, hovering to `#0A0A0A` background with `#F5F3EF` icon.
3. **Session Controls & Navigation (`Flashcards.tsx` + `Flashcards.module.css`)**:
   - Rating buttons:
     - `.ratingButtonAgain`: `#F5F3EF` card surface, `1px solid rgba(10, 10, 10, 0.12)` border, `#0A0A0A` text, hovering to `#EAE7E1` with `#ef4444` icon/text.
     - `.ratingButtonGood`: `#0A0A0A` primary pill button (`color: #F5F3EF`, hover `#222222`, zero `#faf92f` yellow).
   - Navigation buttons (`.navButton`): `#EAE7E1` circular buttons (`border: 1px solid rgba(10, 10, 10, 0.12)`), hovering to `#0A0A0A` bg with `#F5F3EF` icon.
   - Telemetry counter: `Satoshi` `700` tabular numerals (`#0A0A0A`).
   - Start overlay & Story generation block: `#EAE7E1` surface card with `#0A0A0A` primary CTA and `#F5F3EF` segmented tabs.
4. **Active Practice Mode (`ActivePractice.tsx` + `ActivePractice.module.css`)**:
   - Replace legacy dark variables with Pixzen palette (`--black: #0A0A0A; --cream: #F5F3EF; --cream-dim: #4A4A48; --gray-100: #EAE7E1; --gray-200: rgba(10, 10, 10, 0.12); --accent: #0A0A0A`).
   - Mode switcher (`.modeNav`): `#EAE7E1` pill container, `#0A0A0A` active pill with `#F5F3EF` text.
   - Question cards & input boxes: `#EAE7E1` card surfaces, `#FFFFFF` inputs with `#0A0A0A` ink.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/47_pixzen_learning_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/LearningPage/LearningPage.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.module.css`
- `substreamedu-frontend/src/components/LearningPage/ActivePractice.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.test.tsx`
- `substreamedu-frontend/src/components/LearningPage/ActivePractice.test.tsx`

---

## 4. Verification Checklist

1. [x] `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. [x] `npx eslint src/components/LearningPage/LearningPage.tsx src/components/LearningPage/Flashcards.tsx src/components/LearningPage/Flashcard.tsx src/components/LearningPage/Flashcards.test.tsx src/components/LearningPage/ActivePractice.test.tsx` — 0 warnings/errors.
3. [x] `npx react-app-rewired test --watchAll=false src/components/LearningPage` — 2 suites, 7/7 tests passed.

