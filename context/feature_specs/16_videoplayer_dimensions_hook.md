# Feature Spec 16: VideoPlayer Modular Decomposition (Part 8 — useVideoDimensions Hook & Dimension Utils)

## 1. Context & Background
[`VideoPlayer.tsx`](../../substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx) has been reduced from 3,639 lines down to 1,433 lines across Parts 1–7.
However, it still directly manages viewport math, dynamic aspect ratio calculation, zero-scroll theater mode, window resize event listeners, and compact width clamping:
- `DEFAULT_COMPACT_WIDTH = 1050`
- `mediaAspectRatio` state and dynamic ratio detection from HTML5 `<video>` element dimensions (`videoWidth / videoHeight`)
- `isMaxFit` theater mode state
- `calculateMaxFitWidth` vertical/horizontal overhead calculations
- `playerWidth` responsive CSS width calculation
- `handleVideoMetadataWithAspect` metadata event callback
- Window `resize` listener and cleanup
- `toggleMaxFit` toggling between compact width (1050px) and calculated zero-scroll max fit width

Extracting this domain into dedicated pure utilities and a custom React hook encapsulates viewport and aspect ratio logic, reduces cognitive overhead in `VideoPlayer.tsx`, and enables 100% deterministic unit testing of screen-fit math.

---

## 2. Deep Module Seam Design & Requirements

### Pure Utility: `videoDimensionUtils.ts`
- **Constants**:
  - `DEFAULT_COMPACT_WIDTH = 1050`
  - `DEFAULT_ASPECT_RATIO = 16 / 9`
  - `DEFAULT_VERTICAL_OVERHEAD = 152` (76px top header + ~52px control bar + 24px bottom padding)
  - `MIN_PLAYER_WIDTH = 320`
  - `MIN_AVAILABLE_HEIGHT = 240`
- **Functions**:
  - `calculateMaxFitWidth(ratio: number, viewportWidth: number, viewportHeight: number, verticalOverhead?: number): number`:
    Calculates the exact width in pixels that maximizes video area without causing vertical page scrollbars while respecting horizontal viewport constraints.
  - `getVideoAspectRatio(video: HTMLVideoElement | null, fallback?: number): number`:
    Extracts ratio from `video.videoWidth / video.videoHeight`, returning `fallback` (or 16/9) if video element or dimensions are unavailable.

### Custom Hook: `useVideoDimensions.ts`
- **Parameters**:
  ```typescript
  export interface UseVideoDimensionsParams {
      videoUrl: string;
      videoId: string | null;
      videoRef: React.RefObject<HTMLVideoElement>;
      handleVideoMetadata?: () => void;
      verticalOverhead?: number;
      defaultCompactWidth?: number;
  }
  ```
- **Returns**:
  ```typescript
  export interface UseVideoDimensionsResult {
      mediaAspectRatio: number;
      setMediaAspectRatio: React.Dispatch<React.SetStateAction<number>>;
      isMaxFit: boolean;
      setIsMaxFit: React.Dispatch<React.SetStateAction<boolean>>;
      playerWidth: number;
      setPlayerWidth: React.Dispatch<React.SetStateAction<number>>;
      calculateWidth: (ratio?: number) => number;
      handleVideoMetadataWithAspect: () => void;
      toggleMaxFit: () => void;
  }
  ```

---

## 3. Implementation Rules
1. **File Boundaries**:
   - `substreamedu-frontend/src/components/VideoPage/utils/videoDimensionUtils.ts` (new)
   - `substreamedu-frontend/src/components/VideoPage/utils/videoDimensionUtils.test.ts` (new)
   - `substreamedu-frontend/src/components/VideoPage/hooks/useVideoDimensions.ts` (new)
   - `substreamedu-frontend/src/components/VideoPage/hooks/useVideoDimensions.test.ts` (new)
   - `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx` (modify)
   - `context/progress_tracker.md` (modify)
2. **Behavioral Invariants**:
   - Window resize must dynamically recalculate `playerWidth`.
   - When `isMaxFit` is false, `playerWidth` is clamped to `Math.min(DEFAULT_COMPACT_WIDTH, maxAllowedWidth)`.
   - `toggleMaxFit` must seamlessly switch between max fit and compact width.
   - `handleVideoMetadataWithAspect` must invoke `handleVideoMetadata()` and update `mediaAspectRatio` when video dimensions become available.
   - No regression in keyboard shortcut `KeyT` (`useVideoKeyboardShortcuts({ toggleMaxFit })`).

---

## 4. Verification Checklist
- [ ] `npm test -- --watchAll=false` passes all test suites including new dimension test suites.
- [ ] `npm run build` in `substreamedu-frontend` succeeds with exit code 0.
- [ ] Backend tests (`go test ./...`) pass cleanly across Go microservices.
- [ ] `VideoPlayer.tsx` lines reduced further towards modular target.
- [ ] `progress_tracker.md` updated with ADR-072.
