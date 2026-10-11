# Spec 39: Pixzen Monochrome Editorial Redesign — Phase 3 (`VideoPage` & `/youtube-demo` Flow)

**Status**: Completed
**Task Classification**: Ship
**ADR**: ADR-109

## 1. Objective
Extend the **Pixzen Monochrome Editorial** design system to the pages and interactive components reached after clicking `[Try with a YouTube video]` on the homepage (`/youtube-demo?onboarding=true`, `/demo`, `/movies`, and `/videos` — rendered by `VideoPage` and `VideoPlayer`).

## 2. Design Requirements
1. **Scoped Pixzen Theme & Grain**:
   - Activate `usePixzenTheme()` inside `VideoPage.tsx` so `body.pixzen` applies the warm-white (`#F5F3EF`) / soft-gray (`#EAE7E1`) / pure-black (`#0A0A0A`) CSS variables and updates the global `<Header />` automatically.
   - Render `<div className="pixzenGrain" aria-hidden="true" />` inside `VideoPage.tsx`.
2. **Player Header & Navigation Controls (`VideoPlayerPopover.module.css`)**:
   - `.demoBackHomeButton` ("← Back to Home") and `.backButton` ("← Exit" / "← Replace"): Clean editorial pill buttons (`#EAE7E1` surface, `rgba(10, 10, 10, 0.14)` hairline border, `#0A0A0A` ink, uppercase `0.16em` tracking, hover invert to `#0A0A0A` bg with `#F5F3EF` text).
   - `.demoCtaButton` ("Start Free →") and `.minimalistButton`: Pure black `#0A0A0A` pill buttons with `#F5F3EF` text (replacing legacy `#faf92f` yellow).
3. **Onboarding Preset Switcher & Hint (`VideoPage.module.css`, `VideoPlayerPopover.module.css`, `OnboardingGuideBar.module.css`)**:
   - `.onboardingPresetBar` ("Try another video:"): Uppercase `0.18em` muted label + `#EAE7E1` pill buttons with `#0A0A0A` active pill (`#F5F3EF` text).
   - `.onboardingSelectionHint` & `OnboardingGuideBar`: Monochrome editorial surfaces (`#EAE7E1` / `#F5F3EF`) with `1px solid rgba(10, 10, 10, 0.14)` borders and `#0A0A0A` accents instead of yellow `#faf92f`.
4. **Translation Popover (`TranslationPopover.tsx` + `VideoPlayerPopover.module.css`)**:
   - Crisp `#F5F3EF` editorial card surface (`.glass3d` / `.popover`) with `1px solid rgba(10, 10, 10, 0.14)` border, `#0A0A0A` heading & translation text, `#EAE7E1` option/chunk pills, pure black `#0A0A0A` `SAVE` pill button, and frameless rotating `X` close button (no circle border or background).
5. **Video Selection & Upload Surfaces (`/videos`)**:
   - Restyle `VideoPage.module.css` (`.tabNav`, `.tab`, `.tabActive`, `.videoCardWrapper`), `YouTubeUrlInput.module.css`, `QuickStartVideoPicks.module.css`, `RecommendedChannels.module.css`, `VideoUpload.module.css`, `GoogleDriveButton.module.css`, `StatusNotification.tsx`, and player modals (`GrammarSpotlightModal.module.css`, `VideoGrammarIndexModal.module.css`, `LessonStudioModal.module.css`, `SubtitleSearchModal.module.css`, `FilmSelectionModal.module.css`) to use the Pixzen Monochrome Editorial palette and frameless `X` close buttons.

## 3. Implementation Rules (Strict File Boundary)
Only the following files may be created or modified:
- `substreamedu-frontend/src/components/VideoPage/VideoPage.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPage.module.css`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
- `substreamedu-frontend/src/components/shared/TranslationPopover.tsx`
- `substreamedu-frontend/src/components/VideoPage/components/YouTubeUrlInput.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/QuickStartVideoPicks.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/RecommendedChannels.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/VideoUpload.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/GoogleDriveButton.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/OnboardingGuideBar.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/GrammarSpotlightModal.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/VideoGrammarIndexModal.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/LessonStudioModal.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/SubtitleSearchModal.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/FilmSelectionModal.module.css`
- `substreamedu-frontend/src/components/VideoPage/components/StatusNotification.tsx`
- `substreamedu-frontend/src/components/Header.module.css`
- `substreamedu-frontend/src/components/LanguageSelector/LanguageSelector.module.css`
- `context/feature_specs/39_pixzen_video_demo_and_page_redesign.md`
- `context/progress_tracker.md`

## 4. Verification Checklist
- [x] `npx tsc --noEmit` passes with 0 errors.
- [x] `npx eslint` on modified TypeScript files passes with 0 errors and 0 `any` warnings.
- [x] Unit tests in `src/components/VideoPage` pass (21 suites, 135 tests).
