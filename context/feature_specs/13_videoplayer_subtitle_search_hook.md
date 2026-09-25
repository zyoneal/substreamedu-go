# Feature Specification: VideoPlayer Modular Decomposition (Part 5 — useSubtitleSearch Hook)

## Metadata
- **Spec ID**: 13
- **Related Spec**: 09, 10, 11, 12 (VideoPlayer Modular Decomposition Series)
- **Author**: Senior Systems & Frontend Engineer
- **Status**: Active
- **Target File**: `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- **Output Files**:
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleSearchUtils.ts`
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleSearchUtils.test.ts`
  - `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleSearch.ts`
  - `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleSearch.test.ts`

---

## 1. Problem Statement
In `VideoPlayer.tsx`, SubDL subtitle search, title extraction, year/season/episode matching, film candidate selection, subtitle scoring, quick testing, and download persistence span over 530 lines (lines 672–1211).
This creates high cognitive load, tightly couples network orchestration with the React video player component, and inflates `VideoPlayer.tsx` close to 3,000 lines.

Per Rule 10 (Frontend Humble Object & Clean Architecture) and Rule 13 (Component/Hook Size Caps: $\le 250$ lines), this logic should be encapsulated in a dedicated `useSubtitleSearch` hook with pure helper utilities extracted to `subtitleSearchUtils.ts`.

---

## 2. Proposed Architecture & Seams

### A. Subtitle Search Utilities (`subtitleSearchUtils.ts`)
Pure functions with zero React state dependencies:
- `extractVideoNameFromUrl(url: string, storedFileName?: string | null): string`
- `cleanSearchTitle(videoName: string): { targetTitle: string; extractedYear?: number; seasonNumber?: number; episodeNumber?: number; episodeMatch: boolean }`
- `formatSrtTimestamp(ms: number): string`
- `buildSubtitleFileName(baseName: string): string`

### B. Custom Hook (`useSubtitleSearch.ts`)
Manages search state and async operations:
- **State**:
  - `isSearchingSubtitles`: boolean
  - `showSubtitleSearchModal`: boolean
  - `showFilmSelection`: boolean
  - `availableSubtitles`: SubtitleWithScore[]
  - `availableFilms`: SubDLSearchResult[]
  - `searchQueryForFilms`: string
  - `isTemporarySubtitles`: boolean
  - `temporarySubtitleInfo`: SubtitleWithScore | null
- **Actions**:
  - `searchSubtitlesForVideo(customQuery?: string | React.MouseEvent): Promise<void>`
  - `handleSelectFilmForSubtitles(film: SubDLSearchResult): Promise<void>`
  - `handleQuickTest(subtitle: SubtitleWithScore): Promise<void>`
  - `handleKeepTemporarySubtitles(): Promise<void>`
  - `handleDiscardTemporarySubtitles(): void`
  - `handleSelectSubtitleFromSearch(subtitle: SubDLSubtitle): Promise<void>`
  - Setters for modal state (`setShowSubtitleSearchModal`, `setShowFilmSelection`)

---

## 3. Implementation Rules
1. **Zero Behavioral Regressions**: Filename cleaning, SubDL query construction, year matching, fallback TV series search, sync score sorting, quick test blob creation, and `.srt` formatting must remain 100% identical.
2. **File Size Compliance (Rule 13)**: Both `subtitleSearchUtils.ts` and `useSubtitleSearch.ts` must remain strictly $\le 250$ lines.
3. **Unit Test Coverage**: Comprehensive tests covering utilities and hook state transitions.

---

## 4. Verification Checklist
- [ ] `npm run build` exits 0 with zero TypeScript errors.
- [ ] `npm test -- --watchAll=false` passes all test suites.
- [ ] `go test` passes across microservices.
- [ ] `progress_tracker.md` updated with ADR-069.
