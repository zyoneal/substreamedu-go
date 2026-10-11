# Feature Spec 38: Pixzen Monochrome Editorial Redesign — Phase 2 (`LoginPage`)

## 1. Objective & Context
Continue the Pixzen monochrome editorial redesign across `substreamedu-frontend` by transforming the authentication flow (`/login` — `LoginPage` and `Login` form) into the warm-white (`#F5F3EF`), pure-black ink (`#0A0A0A`), Satoshi-typed editorial aesthetic established in Spec 37.

## 2. Implementation Scope
Touch ONLY:
- `substreamedu-frontend/src/components/LoginPage/LoginPage.tsx`:
  - Activate `usePixzenTheme()` and render `<div className="pixzenGrain" aria-hidden="true" />`.
  - Eliminate remaining `any` types (`locationState` and `catch (error: unknown)`).
- `substreamedu-frontend/src/components/LoginPage/Login/Login.tsx`:
  - Align inline error icon color with light-mode semantic danger token (`var(--color-danger, #dc2626)`).
- `substreamedu-frontend/src/components/LoginPage/css/LoginPage.module.css`:
  - Replace dark-mode `#0d0c0b` / `#141312` / `#faf92f` palette with Pixzen monochrome editorial tokens (`#F5F3EF` canvas, `#EAE7E1` secondary surface, `#0A0A0A` ink, `#8E8E8E` muted, hairline borders, Satoshi typography, `cubic-bezier(0.16, 1, 0.3, 1)` transitions).
- `substreamedu-frontend/src/components/LoginPage/css/Login.module.css`:
  - Reskin email input, uppercase `tracking-widest` label, validation states, and primary pill CTA button (`#0A0A0A` fill with `#F5F3EF` text) to Pixzen tokens.
- `substreamedu-frontend/src/components/LoginPage/LoginPage.test.tsx` (new):
  - Unit tests verifying email step rendering, Pixzen theme activation (`body.pixzen`), validation feedback, and OTP transition.
- `context/progress_tracker.md`.

## 3. Verification Checklist
- [ ] `npx tsc --noEmit` — 0 errors.
- [ ] `npx eslint "src/components/LoginPage/**/*.{ts,tsx}" --quiet` — 0 errors.
- [ ] `npx react-app-rewired test --watchAll=false src/components/LoginPage` — all tests pass.
