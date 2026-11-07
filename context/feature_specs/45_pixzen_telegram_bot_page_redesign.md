# Spec 45: Pixzen Monochrome Editorial Redesign — Phase 9 (`TelegramBotPage` / `/telegramBot`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-115
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`), Spec 42 (`42_pixzen_songs_page_redesign.md`), Spec 43 (`43_pixzen_subtitles_page_redesign.md`), Spec 44 (`44_pixzen_subscribe_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video/demo workspace (Spec 39), dashboard (Spec 40), text studio (Spec 41), songs studio (Spec 42), subtitles pages (Spec 43), and subscribe page (Spec 44), the `/telegramBot` page (`TelegramBotPage.tsx`) still uses legacy dark-mode styling (`color: #ede8e0`, `border-bottom: 1px solid #282522`), a light-parchment `.heroCta` button that turns neon yellow (`#faf92f`) on hover, white `#ffffff` stat numbers on a transparent background (rendering invisible when the header or body uses light surfaces), and 300+ lines of dead CSS in `TelegramBotPage.module.css` (exceeding Rule 13's 200-line CSS module limit).

This specification scopes the Pixzen Monochrome Editorial transformation to `TelegramBotPage` (`/telegramBot`).

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`TelegramBotPage.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme` and render `<div className="pixzenGrain" aria-hidden="true" />` inside `.pageWrapper` across all states (loading, error, and loaded).
   - Remove legacy `.ambientGlow` and `.ambientGlowSecond` elements.
   - Add an uppercase editorial kicker `.heroLabel` (`TELEGRAM AI ASSISTANT`) above `.heroTitle`.
   - Import `Rocket` from `'lucide-react'` with `aria-hidden="true"`.
2. **Editorial Hero Card & Telemetry Strip (`TelegramBotPage.module.css`)**:
   - Canvas `.pageWrapper`: `#F5F3EF` warm-white background, `#0A0A0A` ink, `Satoshi` typography.
   - `.heroSection`: `#EAE7E1` secondary editorial card (`border: 1px solid rgba(10, 10, 10, 0.12)`, `border-radius: 24px`, `padding: 64px 48px`).
   - `.heroTitle`: `Satoshi`, `font-weight: 700`, `clamp(30px, 4vw, 48px)`, `line-height: 1.08`, `letter-spacing: -0.032em`, `color: #0A0A0A`.
   - `.heroSubtitle`: `Satoshi`, `font-weight: 400`, `16px`, `line-height: 1.6`, `color: #4A4A48`.
   - `.heroCta`: Pure black `#0A0A0A` pill button (`color: #F5F3EF`, `border-radius: 9999px`, `font-weight: 700`, `letter-spacing: 0.12em`, `text-transform: uppercase`) with `#222222` hover and zero `#faf92f` yellow.
   - `.heroStats`: `#F5F3EF` telemetry bar (`border: 1px solid rgba(10, 10, 10, 0.1)`, `border-radius: 18px`, `padding: 22px 36px`) with `#0A0A0A` `Satoshi` `700` tabular numerals (`30px`), `#8E8E8E` uppercase `tracking-widest` labels, and `1px` `rgba(10, 10, 10, 0.12)` dividers.
   - Purge dead `.benefitsSection`, `.howItWorksSection`, and `.featuresSection` rules so `TelegramBotPage.module.css` remains under 200 lines (Rule 13).

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/45_pixzen_telegram_bot_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/TelegramBotPage/TelegramBotPage.tsx`
- `substreamedu-frontend/src/components/TelegramBotPage/css/TelegramBotPage.module.css`
- `substreamedu-frontend/src/components/TelegramBotPage/TelegramBotPage.test.tsx`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/TelegramBotPage/TelegramBotPage.tsx src/components/TelegramBotPage/TelegramBotPage.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/TelegramBotPage` — all tests pass.
