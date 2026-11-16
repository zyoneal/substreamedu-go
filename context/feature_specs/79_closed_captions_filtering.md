# Feature Spec 79: Closed Captions Filtering (`[music]`, `(laughs)`, `SPEAKER:`)

## Context & Objectives
Subtitles sourced from YouTube auto-captions or SubDL SDH/CC tracks often contain non-dialogue cues (`[music]`, `(laughs)`, `♪ ... ♪`) and uppercase speaker prefixes (`NARRATOR:`, `JOHN:`). These clutter the reading experience and cause `Auto-Pause` to stop on silent/music cues.

This spec adds an opt-in Closed Captions filter toggle:
1. **Pure Sanitizer (`src/utils/subtitleCleaner.ts` + `subtitleCleaner.test.ts`)**:
   - Add `stripClosedCaptions(text)` removing `[...]`, `(...)`, `♪...♪` / `♪♫`, and uppercase speaker labels (`SPEAKER:` / `DR. SMITH:`) at line starts while preserving normal lowercase/mixed-case sentences containing colons (e.g. `"Wait: what?"`).
2. **Player & Auto-Pause Integration (`VideoPlayer.tsx` + `VideoControlsOverlay.tsx`)**:
   - Add `filterCC` toggle persisted in `localStorage` (`substreamedu_filter_cc`) and a `Clean CC` quick pill with `aria-pressed` in `VideoControlsOverlay.tsx`.
   - Pass `displayedSubtitle` (stripped when `filterCC` is enabled) to `SubtitleOverlay` and `useSubtitleTranslation`, and skip CC-only cues in the `Auto-Pause` / `Auto-Loop` boundary check so playback never pauses on `[music]`.

## Allowed files
- `context/feature_specs/79_closed_captions_filtering.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-frontend/src/utils/subtitleCleaner.ts`
- `substreamedu-frontend/src/utils/subtitleCleaner.test.ts`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`

## Acceptance Criteria
1. `stripClosedCaptions` strips `[...]`, `(...)`, `♪...♪`, and uppercase `SPEAKER:` prefixes while preserving normal dialogue and colons in mixed-case prose.
2. Toggling `Clean CC` in `VideoControlsOverlay` updates `filterCC` with `aria-pressed` and persists across reloads.
3. When `filterCC` is active, CC-only cues (e.g. `[music]`) render nothing and do not trigger `Auto-Pause`.
4. `npx tsc --noEmit` and `npm test -- --watchAll=false` pass cleanly.
