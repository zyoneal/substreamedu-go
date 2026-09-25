# Spec 14: VideoPlayer Modular Decomposition (Part 6 — `useVideoKeyboardShortcuts` Hook)

## Metadata
- **Status**: In Progress
- **Author**: Antigravity Senior Engineer
- **Date**: 2026-09-26
- **Target Modules**:
  - `substreamedu-frontend/src/components/VideoPage/hooks/useVideoKeyboardShortcuts.ts`
  - `substreamedu-frontend/src/components/VideoPage/hooks/useVideoKeyboardShortcuts.test.ts`
  - `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- **Pre-requisite Specs**: Spec 13 (`13_videoplayer_subtitle_search_hook.md`)

---

## 1. Executive Summary & Problem Statement
Following the modular decomposition of `VideoPlayer.tsx` (now reduced from 3,639 down to 2,471 lines across Parts 1–5), `VideoPlayer.tsx` still houses keyboard listener lifecycle, key collision prevention (suppression on `INPUT`/`TEXTAREA`), dual-player seeking ($\pm 4$s on `ArrowLeft`/`ArrowRight` across YouTube and HTML5), play/pause toggling (`Space`), theater mode shortcut (`KeyT`), popover reset (`Escape`), and multi-step subtitle loop repeat logic (`handleRepeatCurrentSubtitle`, `repeatSubtitle`).

This violates:
1. **Rule 13 (250-line file cap)**: `VideoPlayer.tsx` remains oversized (~2,471 lines).
2. **Rule 10 (Frontend Humble Object)**: The view component directly manages keyboard event listeners, DOM focus inspections (`document.activeElement`), timer intervals (`setInterval`), and dual-engine video repeat physics (`ontimeupdate`, `youtubePlayer.getCurrentTime`).

Spec 14 extracts all keyboard navigation, dual-engine seek/play-pause toggles, and subtitle loop repetition into an isolated, strongly-typed custom hook: `useVideoKeyboardShortcuts`.

---

## 2. Architectural Analysis & Seam Design

```
+-------------------------------------------------------------------------+
|                               VideoPlayer                               |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                   useVideoKeyboardShortcuts                     |   |
|   |                                                                 |   |
|   |  - Global keydown event listener & INPUT/TEXTAREA guard         |   |
|   |  - Seek relative (+/- 4s) across YouTube & HTML5 Video          |   |
|   |  - Spacebar Play/Pause toggle across YouTube & HTML5 Video      |   |
|   |  - KeyT Max-Fit / Theater Mode toggle                           |   |
|   |  - Escape Popover / Modal dismissal                             |   |
|   |  - 3x Subtitle Loop Repeat with interval & listener cleanup     |   |
|   +-----------------------------------------------------------------+   |
|                                |                                        |
|                                v                                        |
|              onRepeatCurrentSubtitle (VideoControlsOverlay)             |
+-------------------------------------------------------------------------+
```

### Invariants:
1. **Focus Protection**: No keyboard shortcuts shall trigger when typing inside an `INPUT` or `TEXTAREA`.
2. **Zero Media Leakage / Race Conditions**: Subtitle loop interval timers (`setInterval`) and HTML5 `ontimeupdate` callbacks must be safely cancelled when unmounting or re-triggering.
3. **Exact Seek Parity**: `ArrowRight` advances 4 seconds; `ArrowLeft` rewinds 4 seconds (matching ADR-026 phrase-level navigation).
4. **Behavioral Compatibility**: Zero regressions to existing UI controls (`VideoControlsOverlay` repeat button, theater toggle, play/pause).

---

## 3. Public Interface & Component Contracts

### `UseVideoKeyboardShortcutsParams`
```typescript
export interface UseVideoKeyboardShortcutsParams {
    videoId: string | null;
    youtubePlayerRef: React.RefObject<any>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    playVideo: () => void;
    pauseVideo: () => void;
    safePlay: () => void;
    resetPopoverState: () => void;
    toggleMaxFit: () => void;
    subtitlesForVideo: Array<{ text: string; startTimeMs: number; endTimeMs: number }> | null;
    currentSubtitle: string;
    disabled?: boolean;
}
```

### `UseVideoKeyboardShortcutsResult`
```typescript
export interface UseVideoKeyboardShortcutsResult {
    handleRepeatCurrentSubtitle: () => Promise<void>;
    seekRelative: (seconds: number) => void;
    togglePlayPause: () => void;
}
```

---

## 4. Implementation Rules & File Boundaries
1. **Single-Spec Atomicity**: Touch strictly `useVideoKeyboardShortcuts.ts`, `useVideoKeyboardShortcuts.test.ts`, `VideoPlayer.tsx`, and tracker docs.
2. **File Size Compliance**: New hook must stay well below 250 lines (estimated ~130–160 lines).
3. **Clean Teardown**: Remove event listener on cleanup; clear active repeat timer intervals on hook unmount.

---

## 5. Verification Checklist
- [ ] `useVideoKeyboardShortcuts.ts` created under `src/components/VideoPage/hooks/`.
- [ ] `useVideoKeyboardShortcuts.test.ts` created with unit tests for:
  - Input/textarea ignore behavior.
  - Arrow keys ($\pm 4$s) seek execution.
  - Spacebar toggle for HTML5 and YouTube.
  - Escape key popover reset.
  - Repeat subtitle loop triggering.
- [ ] `VideoPlayer.tsx` integrated with `useVideoKeyboardShortcuts`.
- [ ] `npm run build` succeeds (exit code 0).
- [ ] `npm test -- --watchAll=false` all test suites pass.
- [ ] All 5 Go microservices pass tests (`go test`).
- [ ] `progress_tracker.md` updated with ADR-070.
