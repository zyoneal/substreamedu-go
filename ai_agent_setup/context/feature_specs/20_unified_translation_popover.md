# Feature Specification: Unified Contextual Translation Popover

## Metadata
- **Spec ID**: 20
- **Related Spec**: 09 (VideoPlayer Decomposition Part 1), 19 (Universal Modal Primitive)
- **Author**: Senior Systems & Frontend Engineer
- **Status**: Active
- **Target Files**:
  - `substreamedu-frontend/src/components/shared/TranslationPopover.tsx` (New)
  - `substreamedu-frontend/src/components/shared/TranslationPopover.test.tsx` (New)
  - `substreamedu-frontend/src/components/VideoPage/components/VideoTranslationPopover.tsx`
  - `substreamedu-frontend/src/components/SubtitleViewer/SubtitleViewer.tsx`
  - `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.tsx`
  - `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.tsx`

---

## 1. Problem Statement
The contextual translation popover (anchored to text selection in subtitles/lyrics/paste highlighter) is duplicated across 4 major components:
1. `VideoTranslationPopover.tsx` (in `VideoPage`) — previously extracted into a dedicated component.
2. `SubtitleViewer.tsx` — lines 930–1180 (~250 lines of duplicate JSX + duplicate styles).
3. `SongSearchPlayer.tsx` — lines 1329–1530 (~200 lines of duplicate JSX + 400+ lines of duplicate CSS).
4. `TextPasteHighlighter.tsx` — lines 1000–1200 (~200 lines of duplicate JSX).

In total, over **1,500 lines of TypeScript/JSX and CSS** are copied across these four components. Any bug fix or visual polish (e.g., responsive positioning, glassmorphism, phonetic audio, options grid) currently has to be implemented 4 separate times.

---

## 2. Proposed Architecture & Component Seams

### Shared Primitive (`src/components/shared/TranslationPopover.tsx`)
A unified translation popover supporting both structured `TranslationData` (used in `VideoPlayer`) and flat semantic fields (`translation`, `definition`, `transcription`, `imageUrl`, `synonyms`, `collocations`, `examples`, `otherMeanings`, etc. used in `SubtitleViewer`, `SongSearchPlayer`, and `TextPasteHighlighter`).

**Key Capabilities**:
- **Dual Data Mode**: Accepts either `translationData: TranslationData` OR individual props (`translation`, `definition`, `transcription`, `synonyms`, `collocations`, etc.).
- **Dynamic Viewport Placement**: Coordinates `x`, `y`, `showBelow`, `isConstrained`, `maxHeight` relative to viewport boundaries and fullscreen elements.
- **Glassmorphic UI**: Powered by `VideoPlayerPopover.module.css` with 25px backdrop blur fallback and arrow indicator.
- **Interactive Options**: Integrated with `TranslationOptionsGrid` for synonyms, chunks, collocations, and alternative meanings.
- **Dictionary & SRS Actions**: Standardized SAVE button with loading spinner, disabled mutation state, and optional 9:16 Reel button for admin users.
- **Portal Rendering**: Safely renders into `document.fullscreenElement || document.body`.

---

## 3. Implementation Rules & Migration Strategy
1. **Zero Breaking Changes**: `VideoTranslationPopover` must continue to export the exact same interface and satisfy `VideoTranslationPopover.test.tsx` 100%.
2. **Backward Compatibility**: `SubtitleViewer`, `SongSearchPlayer`, and `TextPasteHighlighter` must retain their dictionary saving, audio, and text selection workflows with identical callbacks.
3. **Strict Size Limits**: All new and modified components must respect Rule 13 ($\le 250$ lines for new components, reduction of size on legacy components).
4. **Verification**: Run all frontend test suites (`npm test -- --watchAll=false`), Go service tests, and verify production build (`npm run build`).

---

## 4. Verification Checklist
- [ ] `TranslationPopover.tsx` created in `src/components/shared/` ($\le 250$ lines).
- [ ] `TranslationPopover.test.tsx` created with 100% passing unit tests.
- [ ] `VideoTranslationPopover.tsx` updated to wrap `TranslationPopover` cleanly.
- [ ] `SubtitleViewer.tsx` migrated to `<TranslationPopover />`.
- [ ] `SongSearchPlayer.tsx` migrated to `<TranslationPopover />`.
- [ ] `TextPasteHighlighter.tsx` migrated to `<TranslationPopover />`.
- [ ] All 40+ frontend test suites pass.
- [ ] `npm run build` exits with code 0.
- [ ] `context/progress_tracker.md` updated with ADR-076.
