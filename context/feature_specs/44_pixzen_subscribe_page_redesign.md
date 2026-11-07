# Spec 44: Pixzen Monochrome Editorial Redesign — Phase 8 (`SubscribePage` / `/subscribe`)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-114
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 38 (`38_pixzen_login_page_redesign.md`), Spec 39 (`39_pixzen_video_demo_and_page_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 41 (`41_pixzen_text_paste_redesign.md`), Spec 42 (`42_pixzen_songs_page_redesign.md`), Spec 43 (`43_pixzen_subtitles_page_redesign.md`)

---

## 1. Problem Statement & Scope

Following the Pixzen Monochrome Editorial redesign of the public homepage (Spec 37), login page (Spec 38), video/demo workspace (Spec 39), dashboard (Spec 40), text studio (Spec 41), songs studio (Spec 42), and subtitles pages (Spec 43), the `/subscribe` page (`SubscribePage.tsx`) still uses a global `:root` dark-mode token override (`tokens.module.css` setting `--c-bg-main: #0d0c0b`, `--c-bg-card: #141312`, `--c-accent-hover: #faf92f`), `08 // PLANS & PRICING` technical numbering, electric cobalt `text-primary` on the teacher promo icon, yellow `#faf92f` badges/checkmarks/button hovers, and `any` error typing in `usePromo.ts`.

This specification scopes the Pixzen Monochrome Editorial transformation to `SubscribePage` (`/subscribe`) and its child components (`PlanCard`, `PromoSection`, `usePromo`).

---

## 2. Visual & Interactive Requirements

1. **Theme & Grain Activation (`SubscribePage.tsx`)**:
   - Invoke `usePixzenTheme()` from `../HomePage/pixzen/usePixzenTheme` and render `<div className="pixzenGrain" aria-hidden="true" />` inside `.themeContainer`.
   - Replace `08 // PLANS & PRICING` with a clean uppercase editorial label `PLANS & PRICING` (`Satoshi`, `700`, `letter-spacing: 0.18em`, `#8E8E8E`).
   - Remove `text-primary` from `<GraduationCap />` so it renders in `#0A0A0A` ink.
2. **Editorial Plan Cards (`PlanCard.tsx` + `layout.module.css`)**:
   - Soft-gray `#EAE7E1` base card (`1px solid rgba(10, 10, 10, 0.12)`) and elevated `#FFFFFF` highlighted `PREMIUM` card (`1.5px solid #0A0A0A`).
   - `#0A0A0A` pill `.badgeHighlight` (`#F5F3EF` text) and `#F5F3EF` pill `.badgeRegular` (`#0A0A0A` text).
   - `Satoshi` `700` tabular price figures (`46px`, `-0.035em`), `#0A0A0A` feature checkmarks, `#0A0A0A` primary pill CTA (`#F5F3EF` uppercase `tracking-widest` text), and `#F5F3EF` → `#0A0A0A` secondary pill CTA.
3. **Promo Section & Teacher Banner (`PromoSection.tsx`, `usePromo.ts`, `layout.module.css`, `tokens.module.css`)**:
   - Remove `:root` global variable pollution in `tokens.module.css`.
   - Style `.teacherPromo` and `.promoContainer` in `#EAE7E1` with `1px solid rgba(10, 10, 10, 0.12)`, frameless rotating `X` `.promoClearButton`, and `#0A0A0A` pill `APPLY` button.
   - Replace `error: any` in `usePromo.ts` with `unknown` and an explicit `PromoError` interface.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/44_pixzen_subscribe_page_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/Subscribe/SubscribePage.tsx`
- `substreamedu-frontend/src/components/Subscribe/components/PlanCard.tsx`
- `substreamedu-frontend/src/components/Subscribe/components/PromoSection.tsx`
- `substreamedu-frontend/src/components/Subscribe/hooks/usePromo.ts`
- `substreamedu-frontend/src/components/Subscribe/styles/tokens.module.css`
- `substreamedu-frontend/src/components/Subscribe/styles/layout.module.css`
- `substreamedu-frontend/src/components/Subscribe/SubscribePage.test.tsx`

---

## 4. Verification Checklist

1. `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. `npx eslint src/components/Subscribe/SubscribePage.tsx src/components/Subscribe/components/PlanCard.tsx src/components/Subscribe/components/PromoSection.tsx src/components/Subscribe/hooks/usePromo.ts src/components/Subscribe/SubscribePage.test.tsx` — 0 warnings/errors.
3. `npx react-app-rewired test --watchAll=false src/components/Subscribe` — all tests pass.
