# Spec 10: VideoPlayer Modular Decomposition (Part 2 — Controls Overlay)

## 1. Objective & Problem Statement
[`VideoPlayer.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx) is currently at **3,308 lines**. While Part 1 successfully decoupled the Translation Popover and Options Grid, the player still contains the complete inline overlay for video playback and listening controls (`topControls` and `bottomControls` spanning ~135 lines of JSX, plus auto-hide event handlers, volume, seek, and listening practice toggles).

**Spec 10** extracts the controls overlay into an isolated, deep presentation and interaction component:
[`VideoControlsOverlay.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/components/VideoControlsOverlay.tsx).

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope
- **Create `VideoControlsOverlay.tsx`**:
  - Encapsulate Top Controls:
    - Grammar index launcher (`Sparkles`)
    - Teacher Lesson Studio launcher (`GraduationCap`, desktop only)
    - Subtitle visibility toggle (`Eye` / `EyeOff`)
    - Subtitle Blur listening pill (`Blur`)
    - Subtitle Delay listening pill (`-2s` / `Delay`)
    - Subtitle 3x repeat listening pill (`RotateCcw` / `3x`)
  - Encapsulate Bottom Controls:
    - Volume mute toggle (`VolumeX` / `Volume2` / `Volume1`) & slider (desktop only)
    - Current playback time & total duration formatting
    - Interactive seek bar with click and touch scrubber handling
    - Fullscreen toggle (`Maximize` / `Minimize`)
  - Deep Module seam: Accepts props (`showControls`, `currentTime`, `duration`, `progress`, `volume`, `isMuted`, `isFullscreen`, `isMobile`, `showSubtitles`, `blurSubtitles`, `delay`, and associated interaction callbacks).
  - Target file size $\le 200$ lines (strictly adhering to Rule 13).
- **Integration**:
  - Replace inline `controlsOverlay` markup in `VideoPlayer.tsx` with `<VideoControlsOverlay ... />`.
  - Prune unused icon imports from `VideoPlayer.tsx` (`Volume1`, `Volume2`, `VolumeX`).
- **Test Coverage**:
  - Add `VideoControlsOverlay.test.tsx` verifying renders, controls toggle, seek event triggers, volume mutations, and listening practice pills.
  - Verify all 27+ frontend test suites pass and production build succeeds.

### Out-of-Scope
- Refactoring `SubtitleCueOverlay` (Part 3).
- Modifying backend APIs or database schemas.

---

## 3. Design Alternatives (Design It Twice — Rule 8)

| Dimension | Alternative A: Giant Player Overlay Component (Rejected) | Alternative B: Focused Controls Overlay Deep Module (Selected) |
| :--- | :--- | :--- |
| **Scope** | Bundle error overlays, controls overlay, and subtitle overlays together | Isolate controls overlay strictly to playback and practice buttons/sliders |
| **Rule 13 Compliance** | High risk of exceeding 250 lines (~350+ lines) | Guaranteed $\le 200$ lines |
| **Separation of Concerns** | Tangled playback scrubbing with subtitle text selection DOM refs | Clean separation: controls operate on time/state; subtitle cues operate on text/DOM |
| **Decision** | Rejected | **Selected** |

---

## 4. Component Interface Contract (`VideoControlsOverlay.tsx`)

```typescript
export interface VideoControlsOverlayProps {
    showControls: boolean;
    currentTime: number;
    duration: number;
    progress: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    isMobile: boolean;
    showSubtitles: boolean;
    blurSubtitles: boolean;
    delay: number;
    onVideoClick: () => void;
    onOpenGrammarIndex: () => void;
    onOpenLessonStudio: () => void;
    onToggleSubtitles: () => void;
    onToggleBlur: () => void;
    onDelayChange: (delaySeconds: number) => void;
    onRepeatCurrentSubtitle: () => void;
    onToggleMute: () => void;
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchSeek: (e: React.TouchEvent<HTMLDivElement>) => void;
    onToggleFullscreen: () => void;
}
```

---

## 5. Verification Checklist
- [ ] `VideoControlsOverlay.tsx` line count is $\le 250$ lines.
- [ ] `VideoControlsOverlay.test.tsx` passes with 100% test coverage for controls and practice pill interactions.
- [ ] `npm test -- --watchAll=false` passes across all suites.
- [ ] `npm run build` succeeds with zero TypeScript errors or warnings.
- [ ] `progress_tracker.md` updated with ADR-066.
