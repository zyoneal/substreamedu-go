# Feature Spec 74: Cinematic Espresso Glass Video Player & Viewing Screen Redesign

## Context & Objectives
The video player on `/videos` (`VideoControlsOverlay`, `VideoPlayer`, `SubtitleOverlay`, `SubtitleSelectionBar`, and `VideoPlayerPopover.module.css`) currently uses flat monochrome white-on-black gradients, a disconnected top-right button row, a plain white timeline scrubber, and an unstyled subtitle track selection bar.

This spec upgrades the entire `/videos` viewing experience to the **Cinematic Espresso Glass** aesthetic (`#141312` warm frosted glass, `1px` parchment hairline borders, warm amber accents `#f59e0b` / `#fbd38d`, and `JetBrains Mono` `tabular-nums` timecodes) while preserving 100% of existing player behavior, keyboard shortcuts, accessibility attributes, and mobile WebKit stability:
1. **Espresso Glass HUD Clusters (`VideoControlsOverlay.tsx` + `VideoPlayerPopover.module.css`)**:
   - Group top-right action buttons and quick learning pills (`Blur`, `Delay`, `3x`) inside a unified floating frosted-espresso glass capsule (`rgba(20, 19, 18, 0.72)` with `backdrop-filter: blur(18px) saturate(140%)`, hairline border `rgba(237, 232, 224, 0.12)`, and subtle top inner rim).
   - Replace the neon-green active indicator on `.activePill` with a warm amber accent (`rgba(245, 158, 11, 0.18)` fill, `rgba(245, 158, 11, 0.55)` border, `#fbd38d` ink, and warm amber status dot) and add `aria-pressed` states on toggle controls.
   - Redesign `.bottomControls` as a floating **Espresso Glass Control Dock** (`margin: 0 16px 16px`, `border-radius: 16px`, `padding: 10px 16px`) with a subtle bottom vignette behind it.
   - Upgrade the timeline scrubber (`.seekBar`, `.seekBarProgress`, `.scrubBadge`) with a warm amber-to-ivory progress gradient, crisp `#ede8e0` thumb with warm halo on scrub, and `tabular-nums` `JetBrains Mono` timecodes (`#ede8e0` current / `#9e988f` duration).
   - Align `.verticalVolumePopup` and `.centerBigPlayButton` with the same warm espresso glass material, subtle amber hover rim, `:active` press scale (`0.95`), `@media (hover: hover) and (pointer: fine)` hover gating, and `@media (prefers-reduced-motion: reduce)` fallbacks.
2. **Cinema Stage & Subtitle Dock (`VideoPlayerPopover.module.css` + `SubtitleSelectionBar.tsx`)**:
   - Frame `.videoPlayer` / `.videoPlayerContainer` with a clean `16px` radius and subtle hairline depth shadow (resetting cleanly in fullscreen).
   - Upgrade `.currentSubtitleContainer.hasContent` to an Espresso Glass subtitle card (`rgba(20, 19, 18, 0.92)`, `1px` hairline border, `16px` radius, `#ede8e0` ink).
   - Polish `SubtitleSelectionBar` into a cohesive **Studio Track Bar** card with `lucide-react` icons (`Search`, `Upload`) and tactile pill actions, without emojis or breaking existing test queries.

## Allowed files
- `context/feature_specs/74_cinematic_espresso_video_player_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/SubtitleSelectionBar.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPage.module.css`

## Acceptance Criteria
1. `VideoControlsOverlay` renders top controls inside a unified glassmorphic pill cluster and bottom controls inside a floating Espresso Glass capsule dock, with `aria-pressed` on toggle controls (`Blur`, `Delay`, `Subtitles`) and `tabular-nums` timecodes.
2. `.seekBarProgress` renders the warm amber gradient and `.quickPillButton.activePill` uses warm amber status styling instead of neon green.
3. `.centerBigPlayButton`, `.verticalVolumePopup`, `.currentSubtitleContainer.hasContent`, and `SubtitleSelectionBar` share cohesive Cinematic Espresso Glass surfaces, hairline borders, `@media (hover: hover)` gating, and `@media (prefers-reduced-motion: reduce)` rules.
4. All `VideoPage` unit tests (including `VideoControlsOverlay.test.tsx` and `SubtitleSelectionBar.test.tsx`) and full `./verify.sh` pass cleanly.

