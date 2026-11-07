# Spec 40: Pixzen Monochrome Editorial Redesign — Phase 4 (`DashboardPage`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-110
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), and video/demo workspace (Spec 39), the authenticated Dashboard (`/dashboard` and `/` when logged in, rendered by `DashboardPage.tsx`) and its companion modals (`StreakShareModal.tsx`, `WelcomeModal.tsx`) still render dark `#0d0c0b` / `#141312` surfaces, translucent white cards, neon yellow (`#faf92f`) hover accents, and a circular bordered close button in `StreakShareModal`.

This specification scopes the Pixzen Monochrome Editorial transformation to `DashboardPage` and its two companion modals (`StreakShareModal`, `WelcomeModal`).

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`DashboardPage.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme` so `body.pixzen` is active on `/dashboard` (ensuring the global `Header` also uses the warm-white editorial theme).
   - Render `<div className="pixzenGrain" aria-hidden="true" />` inside `.dashboardContainer`.
2. **Editorial Bento Grid (`DashboardPage.module.css`)**:
   - **Canvas**: Warm white `#F5F3EF` background, `#0A0A0A` ink, `Satoshi` typography.
   - **Page Header**: Bold editorial `Satoshi` display heading (`letter-spacing: -0.03em`, `color: #0a0a0a`).
   - **Bento Cards**: Soft-gray `#EAE7E1` card surface with `1px solid rgba(10, 10, 10, 0.12)` hairline border, `24px` border radius, subtle hover elevation (`#E4E0D8` / `#FFFFFF` tint, `border-color: rgba(10, 10, 10, 0.26)`, `cubic-bezier(0.16, 1, 0.3, 1)`).
   - **Bento Grid Layout Regrouping (Left Formats + Right Telemetry Column)**:
     - **Left Area (Cols 1–8)**:
       - Row 1 (`grid-column: 1 / 9; grid-row: 1`): Featured `Video-based learning` (`cardHeroVideo`).
       - Row 2 (`span 4` each): `Learning with songs` + `Learning with texts`.
       - Row 3 (`span 4` each): `Learning with subtitles` + `Telegram bot practice`.
     - **Right Column (Cols 9–12)**:
       - Row 1 (`grid-column: 9 / 13; grid-row: 1`): `Streak` widget (`cardStreak`).
       - Row 2 (`grid-column: 9 / 13; grid-row: 2`): `Daily Review / Repetition` widget (`cardReview`).
       - Row 3 (`grid-column: 9 / 13; grid-row: 3`): `Dictionary / Vault` widget (`cardVault`).
   - **Right Column Metrics (`Streak`, `Daily Review`, `Dictionary`)**:
     - Tabular `Satoshi` metric numerals (`#0A0A0A`), uppercase `tracking-widest` labels (`#8E8E8E`), monochrome active week dots (`#0A0A0A` bg with `#F5F3EF` check), and deep editorial green (`#15803d`) for completed daily goal status.
     - Eliminate all neon yellow (`#faf92f`) focus rings, active dots, and hover accents.
   - **Learning Format Cards (Video Hero + Songs, Texts, Subtitles, Telegram Bot)**:
     - `.primaryPillBtn` in `#0A0A0A` with `#F5F3EF` text, uppercase `tracking-widest`, hovering to `#262626` with subtle lift.
     - `.iconSquircle` in `#F5F3EF` with `1px solid rgba(10, 10, 10, 0.12)`, inverting to `#0A0A0A` background and `#F5F3EF` icon on card hover.
3. **Companion Modals (`StreakShareModal`, `WelcomeModal`)**:
   - Restyle modal containers to `#F5F3EF` canvas, `#EAE7E1` secondary chips/controls, `1px solid rgba(10, 10, 10, 0.12)` borders, `#0A0A0A` primary pill buttons, and `Satoshi` typography.
   - Replace the circular `.closeButton` in `StreakShareModal.module.css` with the frameless, circle-free `X` button (`background: transparent; border: none; color: #8e8e8e`, hover `color: #0a0a0a; transform: rotate(90deg)`).
   - Remove the remaining `any` type in `StreakShareModal.tsx`.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/40_pixzen_dashboard_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DashboardPage/css/DashboardPage.module.css`
- `substreamedu-frontend/src/components/DashboardPage/components/StreakShareModal.tsx`
- `substreamedu-frontend/src/components/DashboardPage/components/StreakShareModal.module.css`
- `substreamedu-frontend/src/components/DashboardPage/components/WelcomeModal.tsx`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.test.tsx`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/DashboardPage/DashboardPage.tsx src/components/DashboardPage/components/StreakShareModal.tsx src/components/DashboardPage/components/WelcomeModal.tsx src/components/DashboardPage/DashboardPage.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/DashboardPage` — all tests pass.
