# Feature Spec 86: Animated Spring Toggle Switches for Video Player Features

## Context & Objectives
The video player top bar (`VideoControlsOverlay.tsx`) currently renders boolean listening-practice features (`Blur`, `Delay`, `2x Gap`) as plain underlined text buttons. Replacing those boolean controls with a spring-animated `ToggleSwitch` component makes active/inactive feature states immediately legible and tactile while preserving one-click access.

This spec delivers:
1. **Reusable Spring `ToggleSwitch` (`src/components/ui/ToggleSwitch.tsx`, `ToggleSwitch.module.css`, `ToggleSwitch.test.tsx`)**:
   - Rebuilt in React + TypeScript + CSS Modules using the exact dual-spring physics from `designbookmark.com/motion#db-toggle-switch`:
     - Position spring: `stiffness = 320`, `damping = 18`
     - Stretch spring: `stiffness = 300`, `damping = 20`, velocity kick `60` on state flip
     - 4 physics substeps per animation frame; stops the `requestAnimationFrame` loop once settled
   - Respects `prefers-reduced-motion: reduce` (snaps immediately without stretch/bounce).
   - Uses SubStreamEdu Warm Cinematic Espresso tokens (`--font-body` `'e-Ukraine'`, `--color-success`, `--color-on-primary`, `--color-focus-ring`, `--rounded-full`).
   - Accessible `role="switch"` with `aria-checked`, `aria-label`, and optional inline label text.
2. **Video Player HUD Integration (`VideoControlsOverlay.tsx`, `VideoPlayerPopover.module.css`, `VideoControlsOverlay.test.tsx`)**:
   - Replace the `Blur`, `Delay` (`-2s`), and `2x Gap` text buttons with compact (`size="sm"`) `ToggleSwitch` controls while keeping `3x` repeat as an action button.
   - Update unit tests to verify `role="switch"`, `aria-checked`, callbacks, and ordering.

## Allowed files
- `context/feature_specs/86_player_animated_toggle_switches.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/ui/ToggleSwitch.tsx`
- `substreamedu-frontend/src/components/ui/ToggleSwitch.module.css`
- `substreamedu-frontend/src/components/ui/ToggleSwitch.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- `substreamedu-frontend/src/components/VideoPage/hooks/useVideoSubtitles.ts`

## Acceptance Criteria
1. `ToggleSwitch` animates knob travel and horizontal stretch using the exact `(320, 18)` and `(300, 20)` spring parameters with `60` stretch velocity kick, and stops `rAF` once settled.
2. `ToggleSwitch` exposes `role="switch"`, `aria-checked`, keyboard activation, and `prefers-reduced-motion` compliance.
3. `VideoControlsOverlay` renders `Blur`, `Delay` / `-2s`, and `2x Gap` as animated `ToggleSwitch` controls with `3x` repeat action following them.
4. `npx tsc --noEmit` and `npm test -- --watchAll=false` pass cleanly, including `typography.test.ts`.
