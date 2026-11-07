# Spec 15: VideoPlayer Modular Decomposition (Part 7 — `useSubtitleTranslation` Hook & Pure Translation/Highlight Utils)

## Metadata
- **Status**: In Progress
- **Author**: Antigravity Senior Engineer
- **Date**: 2026-09-26
- **Target Modules**:
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleTranslationUtils.ts`
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleTranslationUtils.test.ts`
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleHighlightUtils.tsx`
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleHighlightUtils.test.tsx`
  - `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleTranslation.ts`
  - `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleTranslation.test.ts`
  - `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- **Pre-requisite Specs**: Spec 14 (`14_videoplayer_keyboard_shortcuts_hook.md`)

---

## 1. Executive Summary & Problem Statement
Currently, `VideoPlayer.tsx` is at 2,343 lines. The largest domain block remaining inside `VideoPlayer.tsx` spans ~600 lines across:
1. **Dictionary Word Highlighting Algorithms** (~250 lines): `renderHighlightedText`, `findPhraseMatch`, `findWordMatch`, `isRangeOverlapping`, `formatSubtitleForDisplay`.
2. **Context & Popover Positioning Calculations** (~150 lines): `getExtendedSubtitleContext`, `findSentenceForSubtitle`, `showSelectionTooltip` (viewport edge clamping and top/bottom flip).
3. **Translation Mutation & Popover Coordination** (~200 lines): `handleTextSelection`, `processSelection`, `fetchTranslation`, `translationOptions` memoization, `handleSelectOption`, `resetPopoverState`, `saveToDict`, and popover outside click / scroll repositioning listeners.

This violates **Rule 13 (250-line file cap)** and **Rule 10 (Frontend Humble Object)** by entangling pure linguistic/geometry calculations with React lifecycle and media controls.

Spec 15 extracts these algorithms into pure helpers and encapsulates the translation state pipeline inside `useSubtitleTranslation`.

---

## 2. Architectural Analysis & Seam Design

```
+-----------------------------------------------------------------------------------------+
|                                      VideoPlayer                                        |
|                                                                                         |
|   +------------------------------------+    +---------------------------------------+   |
|   |       subtitleHighlightUtils       |    |        subtitleTranslationUtils       |   |
|   |  - formatSubtitleForDisplay        |    |  - getExtendedSubtitleContext         |   |
|   |  - renderHighlightedSubtitle       |    |  - findSentenceForSubtitle            |   |
|   |  - findPhraseMatch / findWordMatch |    |  - calculatePopoverPosition           |   |
|   +------------------------------------+    +---------------------------------------+   |
|                     ^                                           ^                       |
|                     |                                           |                       |
|   +---------------------------------------------------------------------------------+   |
|   |                            useSubtitleTranslation                               |   |
|   |                                                                                 |   |
|   |  - States: translationData, selectedText, selectedSentence, isPopoverOpen,       |   |
|   |            isLoading, showSubmitButton, note, selectionPosition, activeSelection|   |
|   |  - Methods: handleTextSelection, processSelection, fetchTranslation,            |   |
|   |             handleSelectOption, resetPopoverState, saveToDict                   |   |
|   |  - Lifecycle: clickOutside, scroll positioning, pause/play on popover toggle    |   |
|   +---------------------------------------------------------------------------------+   |
|          |                                             |                                |
|          v                                             v                                |
|    SubtitleOverlay                           VideoTranslationPopover                    |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Public Interfaces & Contracts

### `UseSubtitleTranslationParams`
```typescript
export interface UseSubtitleTranslationParams {
    currentSubtitle: string | null;
    subtitlesForVideo: Array<{ text: string; startTimeMs: number; endTimeMs: number }> | null;
    fluentLanguage: string | null;
    learningLanguage: string;
    getResourceName: () => string;
    isMobile: boolean;
    pauseVideo: () => void;
    playVideo: () => void;
    showNotification: (msg: string) => void;
    saveWordMutation: any;
    isMountedRef: React.RefObject<boolean>;
}
```

### `UseSubtitleTranslationResult`
```typescript
export interface UseSubtitleTranslationResult {
    translationData: TranslationData;
    setTranslationData: React.Dispatch<React.SetStateAction<TranslationData>>;
    selectedText: string | null;
    selectedSentence: string | null;
    isPopoverOpen: boolean;
    setIsPopoverOpen: (open: boolean) => void;
    isLoading: boolean;
    showSubmitButton: boolean;
    note: string;
    setNote: (note: string) => void;
    selectionPosition: SelectionPosition | null;
    activeSelection: { text: string; range: Range } | null;
    translationOptions: TranslationOption[];
    handleSelectOption: (opt: TranslationOption) => void;
    handleTextSelection: () => void;
    processSelection: (selectedText: string, range: Range) => void;
    fetchTranslation: (text: string, sentence: string, isSingleWord: boolean, extended?: string) => Promise<void>;
    resetPopoverState: () => void;
    saveToDict: () => void;
}
```

---

## 4. Implementation Rules & File Boundaries
1. **Single-Spec Atomicity**: Touch strictly `subtitleTranslationUtils.ts`, `subtitleHighlightUtils.tsx`, `useSubtitleTranslation.ts`, corresponding `.test.ts(x)` files, `VideoPlayer.tsx`, and tracker docs.
2. **File Size Compliance**: Keep each file $\le 250$ lines (Rule 13).
3. **No Visual/Behavioral Regressions**: Popover positioning, phrase/word inflection highlighting, options selection coherence, and dictionary saving must maintain 100% parity.

---

## 5. Verification Checklist
- [ ] `subtitleTranslationUtils.ts` + `subtitleTranslationUtils.test.ts` implemented.
- [ ] `subtitleHighlightUtils.tsx` + `subtitleHighlightUtils.test.tsx` implemented.
- [ ] `useSubtitleTranslation.ts` + `useSubtitleTranslation.test.ts` implemented.
- [ ] `VideoPlayer.tsx` integrated with `useSubtitleTranslation` and `subtitleHighlightUtils`.
- [ ] `npm run build` succeeds (exit code 0).
- [ ] `npm test -- --watchAll=false` passes (35+ test suites).
- [ ] All 5 Go microservices pass (`go test`).
- [ ] `progress_tracker.md` updated with ADR-071.
