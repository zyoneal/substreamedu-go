# Feature Spec 04: Frontend Design Token Unification & Aesthetic Polish

## 1. Goal
Purge obsolete legacy color tokens from `tailwind.config.js`, replace hardcoded inline hex values with semantic CSS variable tokens, eliminate all UI emojis in favor of crisp Lucide icons, and ensure strict visual consistency with the **Warm Cinematic Espresso** design system (`#0d0c0b` canvas, `e-Ukraine` typography, 4px grid rhythm).

---

## 2. Design & Architectural Decisions

1. **Tailwind Config Clean-Up**:
   - Remove contradictory legacy aliases (`'primary-blue': '#000000'`, `'neutral-black': '#000000'`, `'night'`, etc.).
   - Bind Tailwind theme colors directly to CSS variables defined in `src/index.css`:
     - `canvas`: `var(--color-canvas)`
     - `surface`: `var(--color-surface)`
     - `surface-elevated`: `var(--color-surface-elevated)`
     - `primary`: `var(--color-primary)`
     - `ink`: `var(--color-ink)`
     - `body`: `var(--color-body)`
     - `mute`: `var(--color-mute)`
     - `hairline`: `var(--color-hairline)`
     - `hairline-strong`: `var(--color-hairline-strong)`
2. **Elimination of Hardcoded Hex Strings**:
   - In `src/App.tsx`, replace repeated inline `bg-[#0d0c0b]` with semantic class `bg-canvas`.
   - Audit and replace ad-hoc `#171717`, `#000000`, and `#fafafa` occurrences across page shells and cards with appropriate tokens (`bg-surface`, `bg-surface-elevated`, `text-ink`, `text-body`).
3. **Eradication of UI Emojis**:
   - Audit all components, buttons, and alert banners for emoji characters (e.g., 🚀, 🧠, 📱, 🎓, ⚠️, ❌).
   - Replace with modern, linear SVG icons from `lucide-react` (e.g., `<Rocket size={18} />`, `<Brain size={18} />`, `<Smartphone size={18} />`).
4. **Bento Grid & Card Styling Compliance**:
   - Enforce subtle `1px border border-hairline` and `rounded-lg` (12px) or `rounded-xl` (16px) across cards.
   - Replace any lingering neon glowing drop-shadows with subtle surface elevation or delicate border contrast.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-frontend/tailwind.config.js` (clean up and align token palette).
- `substreamedu-frontend/src/index.css` (verify all tokens match design specifications).
- `substreamedu-frontend/src/App.tsx` (remove hardcoded hex styles).
- Specific component pages (`HomePage`, `DashboardPage`, `DictionaryPage`, `SubtitlesPage`, `LearningPage`, `Header.tsx`, `Header.module.css`).

### What NOT to Touch:
- Do NOT rewrite API client logic or Axios interceptors.
- Do NOT alter routing paths in `routes/routes.tsx`.
- Do NOT modify Go backend code or Docker configurations.

---

## 4. Verification Checklist
- [x] `tailwind.config.js` compiles without errors and contains zero legacy `#000000` primary aliases.
- [x] Grep for `bg-[#0d0c0b]` across `src/` yields zero matches.
- [x] Grep for emoji Unicode characters across `src/components/` yields zero matches in rendered UI elements.
- [x] `npm run build` completes successfully with zero TypeScript or bundling errors.
- [x] All primary pages (`/`, `/dashboard`, `/dictionary`, `/learning`, `/subtitles`) render visually unified with warm espresso canvas (`#0d0c0b`), clean `e-Ukraine` typography, and Lucide icons.
