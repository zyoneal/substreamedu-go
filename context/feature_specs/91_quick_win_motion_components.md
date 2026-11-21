# Feature Spec 91: Quick-Win Spring Motion Components (`SegmentedControl`, `CopyButton`, `LoadingToSuccessButton`, `AnimatedStatValue`, `SpringDropdown`)

## Context & Objectives
Following the `designbookmark.com/motion` visual polish rollout (Specs 86–90), several high-traffic interactive controls across `/dictionary`, `/learning`, `/dashboard`, `/telegramBot`, `/subscribe`, and `TranslationPopover` still use abrupt state swaps without spring-driven feedback.

This spec delivers 5 fast, high-leverage motion upgrades using GPU-accelerated `transform`/`opacity`, `prefers-reduced-motion` safeguards, and SubStreamEdu design tokens (`e-Ukraine`, `JetBrains Mono`, Pixzen & Warm Cinematic Espresso):

1. **`SegmentedControl` (`src/components/ui/SegmentedControl.tsx`, `.module.css`, `.test.tsx`)**:
   - Dual-spring sliding active pill (`x: k=380, c=28`, `w: k=360, c=28`, 4 substeps, idle-stopped `rAF`, `ResizeObserver`, `prefers-reduced-motion` critical damping).
   - Supports `role="tablist"` (`role="tab"` + `aria-selected`) and `role="group"` (`aria-pressed`), keyboard arrow navigation, and `light` / `dark` themes.
   - Integrated into `DictionaryPage.tsx` (View mode + Source category filter) and `SessionFilterBar.tsx` (`All / Words / Phrases`).
2. **`CopyButton` (`src/components/ui/CopyButton.tsx`, `.module.css`, `.test.tsx`)**:
   - Tactile spring icon morph (`Copy` ↔ `Check`), `navigator.clipboard.writeText` with safe textarea fallback, `aria-live="polite"`, auto-reset after `1800ms`, `prefers-reduced-motion`.
   - Integrated into `TelegramBotPage.tsx` (copy Telegram pairing link) and `TranslationPopover.tsx` (1-click copy selected word/phrase).
3. **`LoadingToSuccessButton` (`src/components/ui/LoadingToSuccessButton.tsx`, `.module.css`, `.test.tsx`)**:
   - Stateful `idle` → `loading` → `success` button with smooth spring-animated icon/label swap and animated checkmark path, preserving `disabled` and `aria-busy`.
   - Integrated into `DictionaryPage.tsx` (`Export Anki`) and `PromoSection.tsx` (`Apply` promo code).
4. **`AnimatedStatValue` (`src/components/ui/AnimatedStatValue.tsx`, `.test.tsx`)**:
   - Spring-driven numeric count-up (`k=160, c=24`, 4 substeps, idle-stopped `rAF`, `tabular-nums`, `toLocaleString()`, instant snap under `prefers-reduced-motion`).
   - Integrated into `DashboardTelemetryCards.tsx` and `DictionaryPage.tsx` telemetry cards.
5. **`SpringDropdown` (`LanguageSelector.tsx`, `LanguageSelector.test.tsx`)**:
   - Upgrades `LanguageSelector.tsx` popover and chevron to crisp spring physics (`stiffness: 420, damping: 28, mass: 0.7`) with `useReducedMotion()` support.

## Allowed files
- `context/feature_specs/91_quick_win_motion_components.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/SegmentedControl.tsx`
- `substreamedu-frontend/src/components/ui/SegmentedControl.module.css`
- `substreamedu-frontend/src/components/ui/SegmentedControl.test.tsx`
- `substreamedu-frontend/src/components/ui/CopyButton.tsx`
- `substreamedu-frontend/src/components/ui/CopyButton.module.css`
- `substreamedu-frontend/src/components/ui/CopyButton.test.tsx`
- `substreamedu-frontend/src/components/ui/LoadingToSuccessButton.tsx`
- `substreamedu-frontend/src/components/ui/LoadingToSuccessButton.module.css`
- `substreamedu-frontend/src/components/ui/LoadingToSuccessButton.test.tsx`
- `substreamedu-frontend/src/components/ui/AnimatedStatValue.tsx`
- `substreamedu-frontend/src/components/ui/AnimatedStatValue.test.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
- `substreamedu-frontend/src/components/LearningPage/components/SessionFilterBar.tsx`
- `substreamedu-frontend/src/components/TelegramBotPage/TelegramBotPage.tsx`
- `substreamedu-frontend/src/components/TelegramBotPage/css/TelegramBotPage.module.css`
- `substreamedu-frontend/src/components/shared/TranslationPopover.tsx`
- `substreamedu-frontend/src/components/Subscribe/components/PromoSection.tsx`
- `substreamedu-frontend/src/components/DashboardPage/components/DashboardTelemetryCards.tsx`
- `substreamedu-frontend/src/components/LanguageSelector/LanguageSelector.tsx`
- `substreamedu-frontend/src/components/LanguageSelector/LanguageSelector.test.tsx`

## Acceptance Criteria
1. All 4 reusable primitives (`SegmentedControl`, `CopyButton`, `LoadingToSuccessButton`, `AnimatedStatValue`) and `LanguageSelector` have deterministic unit tests and respect `prefers-reduced-motion`.
2. Zero regressions across `DictionaryPage.test.tsx`, `Flashcards.test.tsx`, `DashboardPage.test.tsx`, `TelegramBotPage.test.tsx`, `SubscribePage.test.tsx`, and `typography.test.ts`.
3. `./verify.sh` passes cleanly at the final commit SHA.
