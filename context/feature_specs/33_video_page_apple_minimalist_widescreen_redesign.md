# Feature Spec 33: Video Page (`/videos`) Apple-Minimalist Widescreen Redesign

## 1. Objective
Redesign `/videos` (`VideoPage.tsx`, `VideoPage.module.css`, and its tab subcomponents `YouTubeUrlInput`, `QuickStartVideoPicks`, `RecommendedChannels`, `VideoUpload`, `GoogleDriveButton`) to match the Apple-minimalist widescreen (`1560px`) aesthetic of `/dashboard` (ADR-101) and `/dictionary` (ADR-102):
1. **Widescreen Viewport Expansion (`1560px`)**: Expand `.contentWrapper` from `760px`/`620px` to `1560px` (`padding: 84px 48px 36px` on `.dashboardContainer`), eliminating the narrow center column and wide empty black margins on desktop.
2. **Purge Technical Tag & Align Top Bar**: Remove `03 // VIDEO PLAYER` eyebrow and yellow title highlight; place the clean left-aligned page title (`Learn with video`) inline with the segmented source switcher (`YouTube`, `Upload`, `Google Drive`) in a single `.topBar` header row.
3. **Inline Hero URL Input Card**: Redesign `YouTubeUrlInput` into a full-width Apple-minimalist surface card (`22px` squircle, `rgba(255, 255, 255, 0.032)` fill) with the URL input and primary `Watch` pill button arranged inline on one row instead of a full-width stacked button.
4. **Minimalist 4-Column Quick Start Video Cards**: Simplify `QuickStartVideoPicks` cards to thumbnail + title + concise description inside `20px` squircle cards, removing redundant uppercase category tags, sparkle icons, and yellow lightning-bolt `Play & Translate` footers.
5. **Cohesive Upload, Google Drive, Recent Videos & Channels Grids**: Style `VideoUpload`, `GoogleDriveButton`, `recentSection`, and `RecommendedChannels` with the same `rgba(255, 255, 255, 0.032)` translucent squircle surfaces and widescreen grid proportions.

---

## 2. Implementation Rules & Strict File Boundaries
Touch **only** the following files:
1. `substreamedu-frontend/src/components/VideoPage/VideoPage.tsx`
2. `substreamedu-frontend/src/components/VideoPage/css/VideoPage.module.css`
3. `substreamedu-frontend/src/components/VideoPage/components/YouTubeUrlInput.tsx`
4. `substreamedu-frontend/src/components/VideoPage/components/YouTubeUrlInput.module.css`
5. `substreamedu-frontend/src/components/VideoPage/components/QuickStartVideoPicks.tsx`
6. `substreamedu-frontend/src/components/VideoPage/components/QuickStartVideoPicks.module.css`
7. `substreamedu-frontend/src/components/VideoPage/components/RecommendedChannels.module.css`
8. `substreamedu-frontend/src/components/VideoPage/components/VideoUpload.module.css`
9. `substreamedu-frontend/src/components/VideoPage/components/GoogleDriveButton.module.css`
10. `context/feature_specs/33_video_page_apple_minimalist_widescreen_redesign.md`
11. `context/progress_tracker.md`

---

## 3. Verification Checklist
- [ ] `npx react-app-rewired test src/components/VideoPage/ --watchAll=false` passes with 0 errors.
- [ ] `npx tsc --noEmit` passes with exit code 0.
