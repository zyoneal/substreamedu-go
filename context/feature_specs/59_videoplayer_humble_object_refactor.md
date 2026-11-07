# Spec 59: VideoPlayer Humble Object & SRP Refactoring (ub-mode)

- **Status**: Complete
- **Owner**: Frontend Client (`substreamedu-frontend`)
- **Related ADR**: ADR-134
- **Depends On**: Spec 51 (`51_subtitle_video_performance_optimization.md`), Spec 57, Spec 58

---

## 1. Problem Statement

`VideoPlayer.tsx` is 1523 lines long, making it the single largest and most complex component in the frontend codebase. It violates Uncle Bob's **Single Responsibility Principle (SRP)**, **Boundary Discipline**, and the frontend **Humble Object** architectural pattern (`context/code_standards.md` §2.2).

### Evidence (verified in code)

| # | Concern | Location in `VideoPlayer.tsx` | Issues |
|---|---------|--------------------------------|--------|
| E1 | Subtitles lifecycle, sync timer & persistence | Lines 106–128, 455–570, 640–765 | Multi-interval timers (100ms), track sanitization, and sessionStorage coupled with view |
| E2 | Word Tooltip DOM event listeners | Lines 768–830 | Raw `document.addEventListener` for mouseover/mouseout/mousemove tracking dictionary words |
| E3 | Onboarding tour and guest state | Lines 185–264, 308–315 | URL search params, localStorage, and window custom events mixed with player logic |
| E4 | Modal dialogs coordination | Lines 149–165, 1371–1391, 1452–1517 | Reel generator, Grammar exploration, Lesson Studio, and Language modal states cluttering main component |

---

## 2. Alternatives & Design Decisions (Design It Twice)

- **Alternative A (JSX-only splitting)**: Only extract JSX chunks into smaller subcomponents while keeping all state, timers, and event listeners in `VideoPlayer.tsx`.
  - *Rejected*: Does not solve the god-object problem; `VideoPlayer.tsx` remains ~900 lines of dense, untestable state hooks and timer side effects.
- **Alternative B (Humble Object Hooks & Presentation Coordinator)**: Extract focused custom hooks with explicit boundaries:
  1. `hooks/useVideoSubtitles.ts`: Subtitle synchronization, delay, blur, track switching, and timeupdate subscription.
  2. `hooks/useWordTooltip.ts`: Encapsulated tooltip portal state and document event listeners.
  3. `hooks/useVideoOnboarding.ts`: Onboarding steps, URL params, preset recommendations, and custom event dispatchers.
  4. `hooks/useVideoModalsState.ts`: Modals state management for Reels, Grammar, Lesson Studio, and Language overlays.
  - *Selected*: Clean separation of concerns, high testability in isolation, reduces `VideoPlayer.tsx` from 1523 lines down to <500 lines.

---

## 3. Requirements

1. **R1: Subtitles Synchronization Hook (`hooks/useVideoSubtitles.ts`)**:
   - Encapsulate `subtitlesForVideo`, `currentSubtitle`, `delay`, `blurSubtitles`, `showSubtitles`, and `isYoutubeSubsLoading`.
   - Manage the 100ms subtitle update interval and YouTube time polling.
   - Manage `handleSubtitleClick` and YouTube subtitles auto-loading.
2. **R2: Word Hover Tooltip Hook (`hooks/useWordTooltip.ts`)**:
   - Encapsulate `tooltipState` and DOM `mouseover`/`mouseout`/`mousemove` listeners for dictionary word elements.
   - Clean up event listeners on unmount.
3. **R3: Onboarding State Hook (`hooks/useVideoOnboarding.ts`)**:
   - Encapsulate `onboardingDismissed`, `onboardingStep`, `handleDismissOnboarding`, `activePreset`, and `onboardingUnderlineWords`.
   - Listen for `substreamedu:onboarding_completed` and `substreamedu:guest_save_reached`.
4. **R4: Video Modals State Hook (`hooks/useVideoModalsState.ts`)**:
   - Encapsulate `isReelModalOpen`, `reelModalData`, `isGrammarModalOpen`, `selectedGrammarPoint`, `isGrammarIndexOpen`, `isLessonStudioOpen`, and `showLanguageOverlay`.
   - Provide clean open/close handler callbacks.
5. **R5: Thin Humble Object Coordinator (`VideoPlayer.tsx`)**:
   - Coordinate hooks and pass clean props to `VideoControlsOverlay`, `SubtitleOverlay`, `VideoTranslationPopover`, and `VideoPlayerModals`.
   - Preserve 100% existing functionality, keyboard shortcuts, and visual design tokens.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `.agents/skills/ub-mode/**`
- `.agents/workflows/ub-mode.md`
- `substreamedu-frontend/src/utils/textUtils*`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/**`
- `substreamedu-frontend/src/components/LearningPage/**`
- `substreamedu-frontend/src/components/VideoPage/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`

---

## 5. Verification Checklist

1. Unit tests for new hooks pass cleanly.
2. All 21 test suites in `VideoPage` pass without regression.
3. `VideoPlayer.tsx` line count reduced to <500 lines.
4. `check-spec-scope.sh` verifies within boundary.
5. `./verify.sh` passes end-to-end.
