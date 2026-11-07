# Feature Spec 37: Pixzen Monochrome Editorial Redesign вЂ” Phase 1 (Foundation + Public Homepage)

## 1. Objective & Context
User request: redesign the whole frontend in the "Pixzen" style (warm-white monochrome editorial, Satoshi, grain overlay, Lenis smooth scroll, GSAP/Framer interactions), with content rewritten for SubStreamEdu (video / songs / dictionary / AI texts).

The Pixzen prompt targets Next.js 15 + Tailwind v4. This repo is CRA (`react-app-rewired`) + Tailwind v3 + React Router. **Stack migration is out of scope**; the visual system and interactions are ported onto the existing stack.

Rollout is split into specs (single-spec atomicity):
- **Spec 37 (this)** вЂ” foundation + public homepage `/` (guest view) + global Header (needed for visual coherence).
- Spec 38 (planned) вЂ” authenticated app shell: Dashboard, Dictionary, Songs, Text, Learning pages.
- Spec 39 (planned) вЂ” Video player / admin / remaining modals (dark surfaces over video stay dark by design).

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Flip global `:root` tokens to light | Breaks 149 files / ~2900 hardcoded dark colors, video player. Rejected for this spec. |
| B | Scoped theme: `body.pixzen` class (added while `HomePage` mounted) overrides `--color-*` tokens | Header, portals and modals inherit automatically; zero impact on other routes. **Chosen.** |
| C | Separate Next.js project | Duplicates product, breaks routing/auth. Rejected. |

## 3. Implementation Scope
Touch ONLY:
- `substreamedu-frontend/package.json` (+ lock): add `lenis` (approved here; `split-type` NOT added вЂ” words are split manually).
- `substreamedu-frontend/public/index.html`: Satoshi (Fontshare) stylesheet link.
- `substreamedu-frontend/src/styles/pixzen.css` (new) + import in `src/index.css`: scoped tokens, grain, hairline utilities.
- `substreamedu-frontend/src/components/HomePage/pixzen/*` (new): `usePixzenTheme`, `SmoothScroll`, `GrainOverlay`, `TypingHeadline`, `BrandMarquee`, `ManifestoReveal`, `MagneticButton`.
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx`, `HomePage.module.css`, `ScrollingTextWall.module.css`, `HomePage.test.tsx` (mocks only): reskin, new hero typing headline, marquee, manifesto, magnetic CTA. All existing logic, i18n ids, links and demo modal preserved.
- `substreamedu-frontend/src/components/Header.module.css`: replace hardcoded dark colors with tokens.
- `context/progress_tracker.md`.

## 4. Design Rules
- Palette: bg `#F5F3EF`, secondary `#EAE7E1`, ink `#0A0A0A`, muted `#8E8E8E`. Accent = ink (no yellow on light).
- Typography: Satoshi, tight line-height; labels `tracking-widest`/uppercase.
- Grain: fixed SVG fractal noise, opacity `0.03`, `mix-blend-mode: multiply`, `pointer-events: none`.
- Motion: `power4.out`/`cubic-bezier(0.16,1,0.3,1)`; only `transform`/`opacity`; respect `prefers-reduced-motion`.
- No `any`. Mobile stacks to one column.

## 5. Verification Checklist
- [ ] `npx tsc --noEmit` вЂ” 0 errors.
- [ ] `npx eslint "src/**/*.{ts,tsx}" --quiet` вЂ” 0 errors.
- [ ] `npm test -- --watchAll=false src/components/HomePage src/components/Header` вЂ” pass.
- [ ] `npm run build` succeeds.
