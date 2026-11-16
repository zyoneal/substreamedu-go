# Feature Spec 83: Video Silence Speed-Up (`2x Gap`)

## Context & Objectives
Learners watching movies or long YouTube videos often encounter long silent stretches without dialogue. Speeding up playback during silent gaps saves immersion time without missing spoken lines.

This spec adds an opt-in `2x Gap` toggle in `/videos`:
1. **Pure Gap Evaluator (`subtitlePlaybackModes.ts` + `subtitlePlaybackModes.test.ts`)**:
   - Add `evaluateSilenceSpeedup` returning `2` when `isPlaying && skipSilence` is active, no subtitle cue covers `currentTimeMs`, and the next cue is more than `leadInMs` (`350ms`) away within a gap of at least `minGapMs` (`2500ms`); otherwise returns `1`.
2. **Player & HUD Integration (`VideoPlayer.tsx`, `VideoControlsOverlay.tsx`, `VideoControlsOverlay.test.tsx`)**:
   - Add `skipSilence` toggle (`2x Gap` pill with `aria-pressed`) in `VideoControlsOverlay.tsx`.
   - Apply `playbackRate` (`1` or `2`) to both HTML5 `<video>` (`videoRef.current.playbackRate`) and YouTube (`youtubePlayerRef.current.setPlaybackRate`), resetting cleanly to `1` when disabled.

## Allowed files
- `context/feature_specs/83_video_silence_speedup.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-frontend/src/components/VideoPage/utils/subtitlePlaybackModes.ts`
- `substreamedu-frontend/src/components/VideoPage/utils/subtitlePlaybackModes.test.ts`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`

## Acceptance Criteria
1. `evaluateSilenceSpeedup` returns `2` only during qualifying silent gaps (`>= 2500ms` gap, `> 350ms` before next cue) and returns `1` inside cues, short pauses, or within `350ms` lead-in.
2. `VideoPlayer` updates `playbackRate` on HTML5 `<video>` and YouTube only when the target rate changes and resets to `1` when `skipSilence` is turned off.
3. `VideoControlsOverlay` renders the `2x Gap` pill with `aria-pressed` and fires `onToggleSkipSilence`.
4. `npx tsc --noEmit` and `npm test -- --watchAll=false` pass cleanly.
