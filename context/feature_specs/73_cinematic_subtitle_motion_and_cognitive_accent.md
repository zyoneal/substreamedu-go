# Feature Spec 73: Cinematic Subtitle Motion & Cognitive Lexeme Accent

## Context & Objectives
SubStreamEdu connects authentic streaming media with language acquisition under the Warm Cinematic Espresso aesthetic.
Analysis of subtitle rendering in the video player identified several key limitations:
1. **Instant Cue Snap**: When sentences play consecutively without pauses, the DOM node updates instantaneously without transition, causing visually jarring flickers during video playback.
2. **Missing Pedagogical Focus**: Words marked for learning (Dictionary Items) and active grammar points blend uniformly with regular text, forcing learners to expend visual effort searching for target vocabulary while listening.
3. **Static Blur Mode**: The active listening blur mode (`blurSubtitles`) uses a harsh, static CSS blur rather than an immersive, accessible "Ghost-to-Ink" reveal.

This spec implements a two-phase cognitive animation system optimized for deep viewing and vocabulary retention:
- **Phase 1: Cinematic Focus-In (0–140ms)**: Subtitle text enters with GPU-accelerated optical micro-focus (`filter: blur(3px) -> 0`, `scale(0.99) -> 1`, `translateY(3px) -> 0`, `opacity: 0 -> 1`) on cue updates via keying in `SubtitleOverlay.tsx`.
- **Phase 2: Cognitive Lexeme Accent (120–450ms)**: In-context dictionary words gently bloom with a warm amber accent pulse after speech begins, directing peripheral attention to target vocabulary without interrupting listening comprehension.
- **Ghost-to-Ink Blur Mode**: Ambient silhouette blur in active listening mode that cleanly resolves to ink-sharp clarity on hover, tap, or pause (`0.22s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Accessibility & Mobile Safeguards**: Strict `@media (prefers-reduced-motion: reduce)` bypass and iOS Safari WebKit crash-safe opacity-only fallback.

## Allowed files
- `context/feature_specs/73_cinematic_subtitle_motion_and_cognitive_accent.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/VideoPage/components/SubtitleOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/SubtitleOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`

## Acceptance Criteria
1. When `currentSubtitle` changes during playback, the subtitle paragraph remounts smoothly using `key={currentSubtitle}` and triggers `.subtitleFocusIn` animation without layout shift or UI stutter.
2. When `blurSubtitles` is enabled, the subtitle enters using `.subtitleBlurredIn` without overriding the blur filter. Hovering, tapping, or opening the word popover smoothly dissolves the blur with `.isRevealed` or hover transitions.
3. Highlighted dictionary words (`.dictionaryWord`) execute the `.lexemeAccentPulse` keyframe with a 120ms staggered delay, illuminating target vocabulary in warm amber (`#fbd38d` / `rgba(245, 158, 11, 0.5)`).
4. `grammarBadgeContainer` animates smoothly on entry (`.grammarBadgeSlideIn`).
5. Text selection (`window.getSelection()`) and click-to-translate handlers remain 100% operational with zero regression.
6. All unit tests pass in `SubtitleOverlay.test.tsx` and full verification passes via `./verify.sh`.

