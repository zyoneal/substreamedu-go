# Spec 25: Mobile Responsive Spacing, Subtitle Modal Isolation & Demo CTA Polish

## Metadata
- **Spec ID**: 25
- **Title**: Mobile Responsive Spacing, Subtitle Modal Isolation & Demo CTA Polish
- **Status**: In Progress
- **Priority**: P1 (Critical UX / Mobile Ergonomics / Styling Regression)
- **Target Files**:
  - `substreamedu-frontend/src/index.css`
  - `substreamedu-frontend/src/components/HomePage/HomePage.module.css`
  - `substreamedu-frontend/src/components/Header.tsx`
  - `substreamedu-frontend/src/components/VideoPage/components/VideoPlayerModals.tsx`
  - `substreamedu-frontend/src/components/VideoPage/components/SubtitleSearchModal.module.css`
  - `substreamedu-frontend/src/components/VideoPage/utils/subtitleTranslationUtils.ts`
  - `substreamedu-frontend/src/components/shared/TranslationPopover.tsx`
  - `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
  - `context/progress_tracker.md`

---

## 1. Problem Statement
Users identified three critical issues across mobile and desktop environments:

1. **Translation Popover on Mobile Overflows & Traps Controls**:
   - In mobile video and reel viewing, clicking a word in subtitles renders the dictionary popover cramped in an arbitrary 280px container (`max-width: 280px`). This causes excessive line-wrapping and balloons the vertical height.
   - `calculatePopoverPosition` calculates `y` right above the bottom subtitle line without clamping against the top viewport header. Because the card is 400px–500px tall, its top (word title and transcription) extends above the screen into the browser address bar.
   - The close button (`X`) is located at the very bottom of the card content, after definitions, alternatives, and chunks. Because `.popoverContent` has `max-height: 380px`, the user cannot see or tap the close button without scrolling to the bottom.

2. **SubtitleSearchModal Hidden Under Sticky Header on Mobile**:
   - In `VideoPlayer`, `VideoPlayerModals` was rendered directly inside `<motion.div className={styles.videoSection} animate={{ y: 0 }}>`. In CSS, any transformed element forms a new containing block and stacking context for `position: fixed` children.
   - As a consequence, `position: fixed; z-index: 2000;` on `.modalOverlay` is trapped inside `videoSection` below the global fixed `<Header>` (`z-index: 1000`).
   - The top 56px of `SubtitleSearchModal` (including `Available Subtitles` title and the close button `X`) is buried directly under the global navigation header.
   - Additionally, on mobile screens, each subtitle card is excessively tall (padding 16px, 52px buttons, unbounded release name wrapping), allowing only 1.5 cards to fit on a phone screen.

3. **"Start Free" CTA Lost Styles & Footer Clipped on PC**:
   - In `HomePage`, the demo video modal was unified with the `<Modal>` primitive which portals to `document.body`.
   - In `HomePage.module.css`, brand design tokens (`--accent`, `--black`, `--cream`, `--gray-50`, `--gray-200`) were defined strictly under `.page`. Since `document.body` is outside `.page`, `--accent` resolved to transparent and `--black` resolved to inherit. The "Start free" button rendered as an unstyled, dark-on-dark ghost link.
   - On PC, flex item `.modalVideoWrapper` lacked `min-height: 0;`. Since `/movies_example.mp4` has an intrinsic height of 880px, the flex item refused to shrink below 760px, exceeding the modal container's `max-height`. With `overflow: hidden;` on the modal, `.modalFooter` containing the "Start free" button was pushed completely off-screen at the bottom and invisible on desktop/laptop displays.

---

## 2. Architectural Solution

### A. Contextual Translation Popover Mobile Ergonomics
1. **Responsive Mobile Width**:
   - Update `.popover` mobile style to `min(calc(100vw - 24px), 360px)` (instead of cramped 280px).
2. **Viewport-Aware Height Clamping**:
   - In `calculatePopoverPosition`, clamp `maxHeight` so that whenever the popover is rendered above the subtitle (`showBelow = false`), `maxHeight <= topBoundary - parentRect.top - HEADER_CLEARANCE (64px)`.
   - Ensure the popover's top never penetrates above 64px from the top of the viewport.
3. **Persistent Top Close Button**:
   - Add a sticky/persistent top-right close button `X` in `TranslationPopover.tsx` alongside `selectedText` so the user can immediately dismiss the translation card with 1 tap on mobile without scrolling to the bottom.

### B. SubtitleSearchModal Stacking Context Escape & Card Density
1. **Portal Isolation**:
   - Wrap `VideoPlayerModals` in `createPortal(..., document.body)` so modals escape the `motion.div` CSS transform containing block.
   - Ensure `.modalOverlay` covers the full viewport with `z-index: 10000`, placing it above the global header.
2. **Mobile Card Density & Line Clamping**:
   - Compact mobile padding (`10px 12px` instead of `16px`).
   - Action buttons sized to `38px × 38px` (down from `52px × 52px`).
   - Release name limited to 2-line ellipsis (`-webkit-line-clamp: 2`).
   - Ensures 3–4 subtitle options fit on the phone screen instead of 1.5.

### C. Demo Modal CTA Styling & PC Flexbox Containment
1. **Global & Scoped Brand Tokens**:
   - Register `--accent: #faf92f;` and `--accent-hover: #e6e52b;` in `:root` of `index.css`.
   - Provide token definitions and robust color fallbacks in `HomePage.module.css` for `.demoModal` and `.modalCtaBtn`.
2. **Flexbox `min-height: 0` Containment**:
   - Add `min-height: 0;` to `.modalVideoWrapper` and `max-height: 100%;` to `.modalVideo`.
   - Ensure `.modalFooter` has `flex-shrink: 0;` and remains strictly visible within the modal viewport on all screen heights.
3. **Header Landing Class**:
   - Ensure `Header.tsx` activates `unauthenticatedLanding` on unauthenticated homepage visits so landing buttons render the branded yellow CTA.

---

## 3. Verification Checklist
- [ ] Brand tokens `--accent` and `--accent-hover` available globally in `:root` and scoped in `.demoModal`.
- [ ] `.modalCtaBtn` displays bright yellow `#faf92f` background with `#0d0c0b` text.
- [ ] `.modalVideoWrapper` has `min-height: 0;` ensuring `.modalFooter` is visible on laptop/PC viewports.
- [ ] `VideoPlayerModals` renders via `createPortal(..., document.body)` with `z-index: 10000`.
- [ ] `SubtitleSearchModal` title and close button are never obscured by `<Header>`.
- [ ] `TranslationPopover` has persistent close button, responsive mobile width, and clamped top bounds.
- [ ] Unit tests pass across frontend test suites (`npm test -- --watchAll=false`).
- [ ] `progress_tracker.md` updated with ADR-081.
