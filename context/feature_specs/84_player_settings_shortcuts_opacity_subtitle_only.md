# Feature Spec 84: Player Settings — Disable Lemmatization, Shortcuts Toggle, Subtitle Background Opacity & Subtitle-Only Mode

## Context & Objectives
Completes the remaining P2 items (10, 11, 12) from `context/feature_backlog.md`:
1. **Disable Lemmatization (Exact Word Form)**:
   - Backend (`dto.DictionaryRequest`, `ai_service.go`, `ai_prompts.go`): add `DisableLemmatization bool` (`json:"disableLemmatization,omitempty"`), include it in the translation cache key, and instruct the LLM to translate the exact inflected surface form rather than lemmatizing when enabled.
   - Frontend (`SubtitleService.getTranslationProd`, `useSubtitleTranslation.ts`): forward `disableLemmatization` from player settings.
2. **Disable Keyboard Shortcuts**:
   - Wire `shortcutsDisabled` (persisted in `localStorage` `substreamedu_disable_shortcuts`) into `useVideoKeyboardShortcuts({ ..., disabled: shortcutsDisabled })`.
3. **Subtitle Background Opacity**:
   - Wire `subtitleBgOpacity` (`0..1`, default `0.92`, persisted in `localStorage` `substreamedu_subtitle_bg_opacity`) into `SubtitleOverlay.tsx` (`rgba(20, 19, 18, ${subtitleBgOpacity})`).
4. **Subtitle-Only Mode**:
   - Wire `subtitleOnly` (persisted in `localStorage` `substreamedu_subtitle_only`) in `VideoPlayer.tsx` to hide dictionary highlights and grammar badges (`highlightedWords={subtitleOnly ? [] : highlightedWords}`, `activeGrammarPoint={subtitleOnly ? null : activeGrammarPoint}`), leaving clean English subtitles.
5. **Unified Player Settings Popover (`VideoControlsOverlay.tsx` + `VideoPlayerPopover.module.css`)**:
   - Add a compact Espresso Glass `Settings` button and popover menu inside `.topControlsCluster` hosting all four toggles/slider cleanly without cluttering the top bar.

## Allowed files
- `context/feature_specs/84_player_settings_shortcuts_opacity_subtitle_only.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/service/ai_service.go`
- `substreamedu-dictionary-service-go/internal/service/ai_prompts.go`
- `substreamedu-frontend/src/services/SubtitleService.ts`
- `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleTranslation.ts`
- `substreamedu-frontend/src/components/VideoPage/components/SubtitleOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.test.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`

## Acceptance Criteria
1. `createTranslationPrompt` switches from lemma priority to exact surface-form translation when `DisableLemmatization` is true, and cache keys isolate lemmatized vs exact-form responses.
2. `VideoControlsOverlay` exposes a `Player settings` popover with toggles for `Disable shortcuts`, `Subtitle-only mode`, `Exact word form`, and a `Subtitle background` opacity slider.
3. `VideoPlayer` persists all four settings in `localStorage`, disables `useVideoKeyboardShortcuts` when `shortcutsDisabled` is true, hides highlights/grammar in `subtitleOnly` mode, and applies `subtitleBgOpacity` in `SubtitleOverlay`.
4. `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm test -- --watchAll=false` pass cleanly.
