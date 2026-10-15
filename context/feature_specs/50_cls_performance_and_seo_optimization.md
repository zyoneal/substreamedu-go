# Spec 50: CLS Performance & SEO Metadata Optimization

- **Status**: Completed
- **Owner**: Performance & Frontend Architecture
- **Related ADR**: ADR-120
- **Depends On**: Spec 37 (`37_pixzen_homepage_redesign.md`), Spec 49 (`49_pixzen_dashboard_mobile_ux_redesign.md`)

---

## 1. Problem Statement & Scope

A performance and SEO audit of the homepage revealed two critical regressions:
1. **Severe Cumulative Layout Shift (CLS = 1.7582, 28 layout shift events, Max single shift 0.416)**:
   - `TypingHeadline.tsx` initialized with `length = 0`, causing the `h1` to mount empty on first paint.
   - Character-by-character slicing (typing every 85ms and deleting every 45ms) with `text-align: center` shifted the starting X coordinate of the text element on every tick, triggering 28 consecutive Layout Shift events in Chrome's layout engine.
   - On mobile (`max-width: 768px`), `.hero` had `min-height: auto` and no reserved line height, causing the entire page below the hero to jump up and down by up to 0.416 viewport height as characters typed and deleted.
2. **SEO Title & Meta Description Too Long**:
   - `SEO.tsx` blindly appended `| SubStreamEdu` to titles that already included the brand name, generating an 82-character title: `SubStreamEdu | Learn English with Movies, Music & Interactive Texts | SubStreamEdu` (recommended: 30-60 characters).
   - The meta description was 184–190 characters long, exceeding the 160-character truncation threshold on search engine result pages (SERPs).

This specification eliminates layout shifts by transforming the headline into an immediate-paint, compositor-animated (`opacity` + `transform: translateY`) phrase cycler with reserved dimensions, clamps the hero container, and standardizes SEO title and description lengths.

---

## 2. Technical & Visual Requirements

1. **Zero-CLS Phrase Cycler (`TypingHeadline.tsx`)**:
   - Render the initial phrase (`phrases[0]`) immediately on mount (`index = 0`) so first paint has complete text and zero initial layout shift.
   - Transition between phrases using GPU-accelerated Framer Motion properties (`opacity` and `transform: translateY`) which do not trigger layout recalculations.
   - Keep `typeMs` and `deleteMs` in props for backwards compatibility.
   - Respect `prefers-reduced-motion`.

2. **Reserved Layout Box & Mobile Hero Stability (`HomePage.module.css`, `pixzen.module.css`)**:
   - In `HomePage.module.css`:
     - `.heroTitle`: Set `min-height: 1.15em; line-height: 1.1; display: flex; align-items: center; justify-content: center;`.
     - `@media (max-width: 768px)`: Set `.hero` `min-height: calc(100svh - 56px)` and `.heroTitle` `min-height: 1.2em; white-space: normal; text-wrap: balance;`.
   - In `pixzen.module.css`:
     - Add `.headlineCycler` and `.headlineItem` with `min-height: 1.15em; display: inline-flex; align-items: center; justify-content: center;`.

3. **SEO Title & Description Normalization (`SEO.tsx`, `HomePage.tsx`, `public/index.html`)**:
   - In `SEO.tsx`: Guard `fullTitle` so `siteName` is never duplicated if `title.includes(siteName)`.
   - Title: `Learn English with Movies & Music | SubStreamEdu` (48 characters, ideal range 30–60).
   - Description: `Learn English with movies, music, and interactive subtitles. Highlight any phrase to build your smart spaced-repetition dictionary.` (133 characters, ideal range 70–160).
   - Update `og:title`, `og:description`, `twitter:title`, `twitter:description` across `public/index.html` and `HomePage.tsx`.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/50_cls_performance_and_seo_optimization.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/public/index.html`
- `substreamedu-frontend/src/components/SEO/SEO.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.module.css`
- `substreamedu-frontend/src/components/HomePage/pixzen/TypingHeadline.tsx`
- `substreamedu-frontend/src/components/HomePage/pixzen/pixzen.module.css`

---

## 4. Verification Checklist

1. `npm test -- src/components/HomePage src/components/DashboardPage --watchAll=false` passes cleanly.
2. `npx tsc --noEmit` in `substreamedu-frontend` produces 0 errors.
3. `npx eslint src/components/HomePage/HomePage.tsx src/components/SEO/SEO.tsx src/components/HomePage/pixzen/TypingHeadline.tsx` produces 0 warnings/errors.
