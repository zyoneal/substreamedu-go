# Feature Spec 78: Video Player Auto-Pause & Auto-Loop Modes

## Context & Objectives
Language learners practicing listening and shadowing on `/videos` requested two playback controls in the player HUD:
1. **Auto-Pause**: automatically pause playback at the end of each subtitle cue so the learner can read, translate, or shadow the line before continuing.
2. **Auto-Loop**: continuously loop the active subtitle cue without repeatedly pressing the repeat shortcut.

This spec adds both modes cleanly inside `VideoPage`:
- Pure cue-boundary evaluation helper `src/components/VideoPage/utils/subtitlePlaybackModes.ts` with unit tests (`subtitlePlaybackModes.test.ts`).
- `autoPause` and `autoLoop` state + `useEffect` / tick integration in `VideoPlayer.tsx` (mutually exclusive when toggled on so they never conflict).
- Compact `Auto-Pause` and `Loop` quick-pill toggles in `VideoControlsOverlay.tsx` matching the Cinematic Espresso Glass `.quickPillButton` / `.activePill` styling with `aria-pressed` accessibility attributes.

## Allowed files
- `context/feature_specs/78_video_auto_pause_and_loop.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-frontend/src/components/VideoPage/utils/subtitlePlaybackModes.ts`
- `substreamedu-frontend/src/components/VideoPage/utils/subtitlePlaybackModes.test.ts`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`

## Acceptance Criteria
1. When `Auto-Pause` is active and playback passes the end of a subtitle cue (`endTimeMs`), `pauseVideo()` is called once for that cue; resuming playback continues to the next cue without re-pausing on the same cue.
2. When `Auto-Loop` is active and playback reaches the end of the locked/current subtitle cue, `seekTo(startTimeMs / 1000)` is called to loop that cue continuously until `Auto-Loop` is turned off.
3. Enabling `Auto-Pause` disables `Auto-Loop` and vice versa; both toggles expose `aria-pressed` in `VideoControlsOverlay.tsx`.
4. All unit tests (`subtitlePlaybackModes.test.ts`, `VideoControlsOverlay.test.tsx`, full frontend suite, and Go tests) pass cleanly.
