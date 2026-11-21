# Feature Spec 89: Kokonut UI DynamicText Animated Hero Headline

## Context & Objectives
On the public homepage (`/`), `HomePage_heroTitle` currently swaps `HERO_PHRASES` via a basic vertical fade (`TypingHeadline`). Replacing it with Kokonut UI's MIT-licensed **Dynamic Text** (`v2.0.0`, `https://kokonutui.com/docs/texts/dynamic-text`) brings physical letter-morphing motion where shared letters travel on a spring arc, leaving letters tip and fall off the baseline under gravity, entering letters drop in with a landing squash, and digits roll like a mechanical counter.

This spec delivers:
1. **Reusable `DynamicText` (`src/components/ui/DynamicText.tsx`, `DynamicText.module.css`, `DynamicText.test.tsx`)**:
   - Preserves Kokonut UI v2.0.0's exact physics constants (`STEP = 1/120`, `TRAVEL_K = 140 / ζ=0.8`, `LIFT_K = 300 / ζ=0.9`, `ROLL_K = 200 / ζ=0.86`, `SQUASH_K = 1400 / ζ=0.6`, `TILT_K = 140 / ζ=0.7`, `WIDTH_K = 220 / ζ=1`, `GRAVITY = 32`, `DROP = 0.7`, `FALL_FADE = 0.9`, `ROLL = 0.75`, `LAND_SQUASH = -0.16`, `ENTER_STAGGER = 0.035`, `MAX_ENTER_SPREAD = 0.45`, `FADE_RATE = 7`) and timing (`DEFAULT_INTERVAL = { morph: 2200, decode: 2800, cycle: 900 }`, `holdFor` greeting rhythm).
   - Supports all three modes (`morph`, `decode`, `cycle`), `prefers-reduced-motion: reduce`, viewport/visibility pausing (`IntersectionObserver` + `visibilitychange`), and `ResizeObserver` font-load re-placement.
   - Styled with SubStreamEdu tokens (`e-Ukraine` display font inheritance, `JetBrains Mono` for `decode`, `--color-success` accent) and real SubStreamEdu product copy as defaults.
2. **`HomePage.tsx` Hero Integration**:
   - Replaces `TypingHeadline` inside `h1.heroTitle` with `<DynamicText mode="morph" words={HERO_PHRASES} />`.
   - Keeps mobile `.heroTitle` sizing responsive so single-line glyph measurement never overflows narrow viewports while maintaining the 2-line `min-height` layout lock.

## Allowed files
- `context/feature_specs/89_homepage_dynamic_text.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/DynamicText.tsx`
- `substreamedu-frontend/src/components/ui/DynamicText.module.css`
- `substreamedu-frontend/src/components/ui/DynamicText.test.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.module.css`
- `substreamedu-frontend/src/components/HomePage/HomePage.test.tsx`
- `substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.tsx`
- `substreamedu-frontend/src/components/Header.tsx`
- `substreamedu-frontend/src/components/Header.module.css`
- `substreamedu-frontend/src/components/Header.test.tsx`

## Acceptance Criteria
1. `DynamicText` preserves exact Kokonut UI v2.0.0 morph, decode, and cycle physics/timings, pauses off-screen/hidden, and respects `prefers-reduced-motion`.
2. `HomePage` renders `DynamicText` inside `h1.heroTitle` with `HERO_PHRASES` (`Learn English from movies`, `Learn English from music`, `Learn English from any text`) using `e-Ukraine` typography and Pixzen monochrome editorial colors.
3. `npx tsc --noEmit`, `eslint`, `DynamicText.test.tsx`, `HomePage.test.tsx`, `typography.test.ts`, and `./verify.sh` pass cleanly.
