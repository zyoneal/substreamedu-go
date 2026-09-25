# Spec 11: VideoPlayer Modular Decomposition (Part 3 — Subtitle Overlay)

## 1. Objective & Problem Statement
In [`VideoPlayer.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx), the subtitle rendering block is currently copy-pasted twice:
1. Lines ~2750–2850: Fullscreen subtitle overlay
2. Lines ~2852–2957: Non-fullscreen inline subtitle overlay

Both blocks share ~104 lines of identical code:
- Loading indicator pulse for YouTube & SubDL fetching
- Empty state message ("No subtitles found for this video.")
- Grammar badge launcher (`activeGrammarPoint`) with CEFR pill and `Sparkles` icon
- Mouse selection (`onMouseUp` -> `handleTextSelection()`)
- Mobile touch reveal timer (3.5s auto-hide for blurred subtitles)
- Hover play/pause controls preventing unwanted playback while reading
- Context menu suppression on non-Android devices

This massive duplication inflates `VideoPlayer.tsx` by over 200 lines and risks behavioral divergence between fullscreen and windowed playback.

**Spec 11** consolidates both into a single unified Deep Module:
[`SubtitleOverlay.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/components/SubtitleOverlay.tsx).

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope
- **Create `SubtitleOverlay.tsx`**:
  - Encapsulate subtitle container with responsive styling (applying `styles.fullscreenSubtitles` when `isFullscreen` is true, or inline box padding when false).
  - Encapsulate loading state pulse and empty subtitle notification.
  - Encapsulate Grammar point badge button.
  - Encapsulate touch reveal handling for listening blur practice.
  - Encapsulate hover pause/play lifecycle for text reading.
  - Target file size $\le 200$ lines (Rule 13).
- **Integration**:
  - Replace the dual fullscreen/inline blocks in `VideoPlayer.tsx` with a single `<SubtitleOverlay ... />` call.
  - Reduce `VideoPlayer.tsx` by ~200 lines.
- **Verification**:
  - Add comprehensive unit tests `SubtitleOverlay.test.tsx` testing normal cue rendering, loading states, grammar badges, blur practice, and selection callbacks.
  - Run all 28+ test suites and `npm run build`.

### Out-of-Scope
- Refactoring `renderHighlightedText` algorithm (already working and tested).
- Modifying backend APIs or database schemas.

---

## 3. Design Alternatives (Design It Twice — Rule 8)

| Dimension | Alternative A: Dual Subtitle Components (Rejected) | Alternative B: Single Unified SubtitleOverlay (Selected) |
| :--- | :--- | :--- |
| **Component Architecture** | Separate `FullscreenSubtitleOverlay.tsx` and `InlineSubtitleOverlay.tsx` | Single `SubtitleOverlay.tsx` parameterized by `isFullscreen` |
| **Code Duplication** | Retains 100+ lines of duplicate logic between components | Zero duplication; unified maintenance seam |
| **Rule 13 Compliance** | Creates 2 files of ~120 lines each | 1 clean file of ~170 lines ($\le 250$ lines) |
| **Decision** | Rejected | **Selected** |

---

## 4. Component Interface Contract (`SubtitleOverlay.tsx`)

```typescript
export interface SubtitleOverlayProps {
    isFullscreen: boolean;
    showSubtitles: boolean;
    currentSubtitle: string | null;
    isLoadingSubtitles: boolean;
    hasNoSubtitlesForVideo: boolean;
    activeGrammarPoint: DetectedGrammarPoint | null;
    blurSubtitles: boolean;
    isMobile: boolean;
    isPopoverOpen: boolean;
    isLoadingTranslation: boolean;
    videoWrapperRef?: React.RefObject<HTMLDivElement>;
    onTextSelection: () => void;
    onExploreGrammar: (point: DetectedGrammarPoint, sentence: string) => void;
    onPauseVideo: () => void;
    onPlayVideo: () => void;
    renderedSubtitle: React.ReactNode;
}
```

---

## 5. Verification Checklist
- [ ] `SubtitleOverlay.tsx` file size is $\le 250$ lines.
- [ ] `SubtitleOverlay.test.tsx` passes covering all UI states and grammar badge triggers.
- [ ] `VideoPlayer.tsx` line count is reduced by ~200 lines.
- [ ] `npm test -- --watchAll=false` passes cleanly across all test suites.
- [ ] `npm run build` exits 0.
- [ ] `progress_tracker.md` updated with ADR-067.
