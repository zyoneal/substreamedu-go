# Spec 48: Pixzen Monochrome Editorial Redesign — Phase 12 (Mobile Bottom Sheet & Header Dropdown)

- **Status**: Completed
- **Owner**: Frontend Architecture
- **Related ADR**: ADR-118
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 40 (`40_pixzen_dashboard_page_redesign.md`), Spec 46 (`46_pixzen_dictionary_page_redesign.md`), Spec 47 (`47_pixzen_learning_page_redesign.md`)

---

## 1. Problem Statement & Scope

On mobile devices, opening the header menu displays a floating bottom sheet drawer (`.bottomSheet` in `Header.module.css` via `createPortal(..., document.body)`). While the rest of the application has transitioned to the **Pixzen Monochrome Editorial** system (`#F5F3EF` warm-white canvas, `#EAE7E1` editorial surfaces, `#0A0A0A` ink, and zero `#faf92f` yellow accents), the mobile navigation sheet remained styled with legacy darkroom rules:
1. `background: #141312` pitch-black container.
2. Link text `color: var(--color-ink)` evaluates to `#0A0A0A` in `body.pixzen`, causing black text to be rendered on a pitch-black background, making non-active navigation items virtually invisible.
3. Active link is styled with `color: #faf92f` (neon yellow) on `rgba(250, 249, 47, 0.08)`.
4. Dark brown drag handle (`#4a453f`), dark backdrop (`rgba(13, 12, 11, 0.7)`), and dark border (`#282522`).
5. Desktop dropdown menu (`.dropdownContent`) and `.logoutLink` still contain legacy dark borders and white text overrides.

This specification details the transformation of the mobile navigation bottom sheet and dropdown menu to Pixzen Monochrome Editorial.

---

## 2. Visual & Interactive Requirements

1. **Mobile Bottom Sheet Backdrop (`.bottomSheetBackdrop`)**:
   - `background: rgba(10, 10, 10, 0.4)` soft ambient dim.
   - `backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);` glassmorphism.
2. **Mobile Bottom Sheet Surface (`.bottomSheet`)**:
   - `background: #F5F3EF` warm-white canvas.
   - `border-top: 1px solid rgba(10, 10, 10, 0.12)` hairline border.
   - `border-radius: 24px 24px 0 0` smooth top squircle curvature.
   - `box-shadow: 0 -16px 48px rgba(10, 10, 10, 0.14)`.
   - `font-family: 'Satoshi', var(--font-body, system-ui, -apple-system, sans-serif)`.
3. **Drag Handle (`.dragHandle`)**:
   - `width: 36px; height: 5px; border-radius: 9999px`.
   - `background: rgba(10, 10, 10, 0.2)`.
   - On active drag: `background: rgba(10, 10, 10, 0.35)`.
4. **Navigation Items (`.bottomSheetLink`)**:
   - `min-height: 48px; padding: 0 16px; border-radius: 14px`.
   - Normal state: `color: #4A4A48` (charcoal body text, perfectly legible on `#F5F3EF`), `font-size: 15px`, `font-weight: 500`.
   - Hover state: `color: #0A0A0A; background: rgba(10, 10, 10, 0.05)`.
   - Active tap physics: `transform: scale(0.985); background: rgba(10, 10, 10, 0.08)`.
   - Active route (`.bottomSheetLink.active`):
     - `color: #0A0A0A`.
     - `background: #EAE7E1` secondary editorial pill surface.
     - `border: 1px solid rgba(10, 10, 10, 0.08)`.
     - `font-weight: 600`.
     - Zero `#faf92f` yellow.
5. **Exit / Logout (`.bottomSheetLogout`)**:
   - `min-height: 48px; padding: 0 16px; border-radius: 14px`.
   - `color: #dc2626` editorial crimson.
   - `border-top: 1px solid rgba(10, 10, 10, 0.1)`.
   - Hover: `background: rgba(220, 38, 38, 0.06)`.
   - Active: `background: rgba(220, 38, 38, 0.12); transform: scale(0.985)`.
6. **Desktop Dropdown Menu (`.dropdownContent` & `.logoutLink`)**:
   - `background: #EAE7E1; border: 1px solid rgba(10, 10, 10, 0.12); border-radius: 16px; box-shadow: 0 16px 36px rgba(10, 10, 10, 0.12)`.
   - Links: `color: #4A4A48; hover: color: #0A0A0A, background: rgba(10, 10, 10, 0.05); active: color: #0A0A0A, background: rgba(10, 10, 10, 0.08), font-weight: 600`.
   - Logout: `color: #dc2626; border-top: 1px solid rgba(10, 10, 10, 0.1)`.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/48_pixzen_mobile_bottom_sheet_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/Header.module.css`
- `substreamedu-frontend/src/components/Header.test.tsx`

---

## 4. Verification Checklist

1. [x] `npx tsc --noEmit` in `substreamedu-frontend` — 0 errors.
2. [x] `npx eslint src/components/Header.tsx src/components/Header.test.tsx` — 0 warnings/errors.
3. [x] `npx react-app-rewired test --watchAll=false src/components/Header.test.tsx` — 6/6 tests passed.
4. [x] `npm run build` — compiled cleanly (exit code 0).
