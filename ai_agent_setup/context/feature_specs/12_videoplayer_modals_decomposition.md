# Feature Specification: VideoPlayer Modular Decomposition (Part 4 — Modals & Subtitle Selection Bar)

## Metadata
- **Spec ID**: 12
- **Related Spec**: 09, 10, 11 (VideoPlayer Modular Decomposition Series)
- **Author**: Senior Systems & Frontend Engineer
- **Status**: Active
- **Target File**: `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- **Output Components**:
  - `substreamedu-frontend/src/components/VideoPage/components/SubtitleSelectionBar.tsx`
  - `substreamedu-frontend/src/components/VideoPage/components/SubtitleSelectionBar.test.tsx`
  - `substreamedu-frontend/src/components/VideoPage/components/VideoPlayerModals.tsx`
  - `substreamedu-frontend/src/components/VideoPage/components/VideoPlayerModals.test.tsx`

---

## 1. Problem Statement
`VideoPlayer.tsx` still contains over 3,050 lines of code. While parts 1–3 extracted the Translation Popover, Controls Overlay, and Subtitle Overlay, two distinct presentation blocks remain directly embedded in the render tree:
1. **Subtitle Selection & Upload Bar** (lines 2772–2816): The fallback row for selecting subtitles from dropdown (`SearchableSelect`), uploading custom `.srt`/`.vtt` files, and initiating SubDL automated search.
2. **Video Player Modal Cluster** (lines 2960–3050): 6 separate modals directly instantiated at the bottom of the player JSX (`SubtitleSearchModal`, `FilmSelectionModal`, `ReelGeneratorModal`, `GrammarSpotlightModal`, `VideoGrammarIndexModal`, and `LessonStudioModal`), cluttering imports and layout hierarchy.

Per Rule 13 (Component Size Caps: $\le 250$ lines for `.tsx`) and Rule 10 (Frontend Humble Object & Clean Architecture), these two sections should be extracted into focused subcomponents.

---

## 2. Proposed Architecture & Component Seams

### A. SubtitleSelectionBar (`SubtitleSelectionBar.tsx`)
- **Responsibility**: Pure presentational and action-triggering bar displayed when no subtitle is selected, not playing a direct videoId, and not extracting MKV tracks.
- **Props**:
  - `subtitles`: `Array<{ value: string; label: string }>`
  - `fileName`: `string`
  - `isSearchingSubtitles`: `boolean`
  - `subtitleInputRef`: `React.RefObject<HTMLInputElement>`
  - `onSelectSubtitle`: `(value: string) => void`
  - `onSearchSubtitles`: `() => void`
  - `onUploadSubtitles`: `(e: React.ChangeEvent<HTMLInputElement>) => void`
- **Target Size**: $\le 90$ lines.

### B. VideoPlayerModals (`VideoPlayerModals.tsx`)
- **Responsibility**: Houses and manages the 6 player modals at the portal/root level.
- **Props**:
  - Subtitle search: `showSubtitleSearchModal`, `availableSubtitles`, `isSearchingSubtitles`, `onCloseSubtitleSearch`, `onSelectSubtitleFromSearch`, `onQuickTestSubtitle`, `onOpenFilmSelection`
  - Film selection: `showFilmSelection`, `availableFilms`, `searchQueryForFilms`, `onCloseFilmSelection`, `onSelectFilm`, `onSearchSubtitlesAgain`
  - Reel generator: `isReelModalOpen`, `reelModalData`, `videoSource`, `youtubeVideoId`, `movieTitle`, `onCloseReelModal`
  - Grammar spotlight: `isGrammarModalOpen`, `selectedGrammarPoint`, `grammarSentence`, `learningLanguage`, `fluentLanguage`, `onCloseGrammarModal`
  - Video grammar index: `isGrammarIndexOpen`, `videoGrammarMatches`, `onCloseGrammarIndex`, `onSelectGrammarCue`
  - Lesson studio: `isLessonStudioOpen`, `isMobile`, `videoTitle`, `mediaSource`, `youtubeId`, `subtitlesForLesson`, `onCloseLessonStudio`, `onSeekToTime`
- **Target Size**: $\le 160$ lines.

---

## 3. Implementation Rules
1. **Zero UI Regressions**: All modal open/close flows, subtitle searches, reel exports, and file uploads must continue to function identically.
2. **Strict File Limit**: Both new components must remain strictly under the 250-line limit (Rule 13).
3. **Accessibility**: All buttons and interactive inputs must have semantic tags, accessible names, and proper disabled states (Rule 12).
4. **Unit Test Coverage**: Comprehensive unit test suites verifying prop forwarding and event triggers.

---

## 4. Verification Checklist
- [ ] `npm run build` exits 0 with zero TypeScript errors.
- [ ] `npm test -- --watchAll=false` passes all test suites.
- [ ] `go test` passes across microservices.
- [ ] `progress_tracker.md` updated with ADR-068.
