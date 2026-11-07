# Feature Spec 64: Homepage Hero Cinema Player Mockup & Instant Comprehension

## 1. Objective & Context
Analysis of the homepage revealed that while the copy and value proposition are exceptionally strong, the above-the-fold Hero section relied on an abstract `ScrollingTextWall` (a 3D scrolling perspective of plain text quotes) rather than visually showcasing the actual product: the interactive video player with blurred subtitles, phrase translation, and SRS dictionary integration.

This spec implements:
1. **Interactive Hero Cinema Player (`HeroCinemaPlayer.tsx`)**: Replaces the abstract text wall with a high-fidelity, interactive cinematic video player mockup directly demonstrating:
   - Active Listening subtitle blur with hover-to-reveal.
   - Cursor selection of multi-word idioms and clauses (`call it a day`).
   - Contextual translation popover with phonetics, definition, and interactive "Add to Dictionary" state.
   - Interactive source pill switcher (Movies, YouTube, Synced Songs) to demonstrate all primary content modes in < 3 seconds.
2. **Hero Copy & Visual Hierarchy Polish**:
   - Solidifies the hero title and eyebrow so visitors immediately understand the app's purpose within 3 seconds of landing.
   - Preserves all existing routes, links, analytics events, and guest limit integrations.

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Replace text wall with a static PNG screenshot | Fast, but loses interactivity, doesn't demonstrate subtitle blur or SRS interaction, and looks flat on retina screens. Rejected. |
| B | Embed full heavy React video player in hero | Overkill: loads full video codecs, heavyweight dependencies, network overhead, and slows initial FCP/LCP. Rejected. |
| C | Interactive Glassmorphic Cinema Mockup Component with live interactions (blur toggle, dictionary save feedback, source switcher) | Lightweight, instantaneous LCP, highly engaging micro-interactions, responsive on mobile and desktop, clearly communicates product in 3 seconds. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/64_homepage_hero_cinema_mockup.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/public/assets/interstellar_cinema_scene.jpg`
- `substreamedu-frontend/public/assets/suits_podcast_scene.jpg`
- `substreamedu-frontend/public/assets/castle_hill_scene.jpg`
- `substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.tsx`
- `substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.module.css`
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.module.css`
- `substreamedu-frontend/src/components/HomePage/HomePage.test.tsx`

## 4. Verification Checklist
- [ ] `check-spec-scope.sh` passes.
- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] `npm test -- --watchAll=false src/components/HomePage` passes cleanly.
- [ ] Full `./verify.sh` passes without regressions.
