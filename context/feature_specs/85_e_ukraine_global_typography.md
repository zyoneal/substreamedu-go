# Feature Spec 85: Global `e-Ukraine` Typography Enforcement

## Context & Objectives
Ensure the `e-Ukraine` typeface is consistently applied across the entire frontend application (including all `body.pixzen` pages, CSS modules, inline styles, and canvas generators), eliminating legacy `Satoshi`, `Nunito`, and `SF Pro` / `Inter` overrides while preserving `JetBrains Mono` for monospace metrics, timecodes, and code per `context/ui_context.md`.

1. **Root & Theme Variables**:
   - Update `substreamedu-frontend/src/styles/pixzen.css` so `body.pixzen` sets `--font-display` and `--font-body` to `'e-Ukraine', system-ui, -apple-system, sans-serif`.
   - Update `substreamedu-frontend/public/index.html` to remove Fontshare `Satoshi` and Google Fonts `Nunito` links, and use `'e-Ukraine'` in `<noscript>`.
2. **Component Styles & Canvas Rendering**:
   - Replace all `'Satoshi'` font-family declarations and fallbacks across `substreamedu-frontend/src/**/*.css` and `substreamedu-frontend/src/**/*.tsx` with `'e-Ukraine'`.
   - Replace `-apple-system / SF Pro / Inter` canvas font strings in `ReelGeneratorModal.tsx` with `"e-Ukraine", -apple-system, BlinkMacSystemFont, sans-serif`.
3. **Regression Guard**:
   - Add `substreamedu-frontend/src/typography.test.ts` to verify `e-Ukraine` is configured in `index.css` & `pixzen.css` and that `Satoshi`, `Nunito`, and banned font families (`Inter`, `SF Pro`) do not reappear in frontend styles or `public/index.html`.

## Allowed files
- `context/feature_specs/85_e_ukraine_global_typography.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/public/index.html`
- `substreamedu-frontend/src/**`

## Acceptance Criteria
1. `Satoshi` and `Nunito` are completely removed from `substreamedu-frontend/public/index.html` and `substreamedu-frontend/src/**`.
2. `body.pixzen` and all component CSS modules resolve headings and body copy to `e-Ukraine` (with `JetBrains Mono` preserved for `--font-mono` metrics/timecodes/code).
3. `substreamedu-frontend/src/typography.test.ts` fails before the changes (RED) and passes after (GREEN).
4. `npx tsc --noEmit`, diff-scoped ESLint, and `npm test -- --watchAll=false` pass cleanly.
