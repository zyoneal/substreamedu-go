# Feature Spec 36: Homepage (`/`) Widescreen Grid Expansion

## 1. Objective & Context
The user requested: *"на главной только расположение измени. типо пошире сетку а остальное не трогай"*.
Expand the homepage container and content grids to 1560px widescreen without altering the visual design, borders, or typography of cards and components.

## 2. Implementation Scope
Touch ONLY:
- `substreamedu-frontend/src/components/HomePage/HomePage.module.css`:
  - Expand `.container` to `max-width: 1560px;`.
  - Expand `.heroLayout` to `max-width: 1560px;`.
  - Expand `.pricingGrid` `max-width` from `960px` to `1200px;`.
  - Leave all card borders, table grids, typography, FAQ lines, and elements untouched.
- `context/progress_tracker.md`

## 3. Verification Checklist
- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] `npx eslint "src/**/*.{ts,tsx}" --quiet` passes with 0 errors.
- [ ] `HomePage.test.tsx` passes with 0 failures.
