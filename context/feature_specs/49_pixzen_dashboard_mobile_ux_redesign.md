# Spec 49: Pixzen Dashboard Mobile UX & Habit-First Architecture

- **Status**: Completed
- **Owner**: Frontend Architecture & Design Engineering
- **Related ADR**: ADR-119
- **Depends On**: Spec 40 (`40_pixzen_dashboard_page_redesign.md`)

---

## 1. Problem Statement & Scope

On desktop, the authenticated Dashboard (`DashboardPage.tsx`) presents a balanced, asymmetric 12-column Bento Grid: 2/3 width on the left for learning formats (`Video`, `Songs`, `Texts`, `Subtitles`, `Telegram Bot`), and 1/3 width on the right for daily habit and vocabulary telemetry (`Streak`, `Repetition / 50 Cards Today`, `Dictionary Vault`).

However, on mobile screens (`<= 768px`), collapsing the 12-column grid to a single column caused severe UX and cognitive degradation:
1. **Interleaved DOM Chaos (Row-by-Row Stacking)**: Because the desktop grid ordered cards row-by-row, the mobile DOM sequence interleaved formats and metrics (`Video` -> `Streak` -> `Songs` -> `Texts` -> `50 Cards` -> `Subtitles` -> `Telegram` -> `Dictionary`).
2. **Habit Loop Disconnect**: The user's primary mobile intent—quick daily review and maintaining streak—was buried under multiple 3-line format paragraphs. The #1 actionable CTA (`START REVIEW`) was pushed below the fold.
3. **Severe Vertical Bloat**: Five separate format cards, each containing verbose explanatory paragraphs, created over 800px of scrolling fatigue.
4. **Device Affordance Mismatch**: Cards advertised desktop-heavy actions ("from your computer", subtitle file uploads) rather than prioritizing mobile-friendly tap interactions.

This specification redesigns the responsive mobile architecture of `DashboardPage` to be **Habit-First**, placing the daily habit loop at the top, transforming secondary learning formats into a compact 2x2 touch grid, and elevating the daily repetition review to an immediate thumb-zone CTA.

---

## 2. Visual & Interactive Requirements

1. **Habit-First Mobile Ordering (`@media (max-width: 768px)`)**:
   - Explicit CSS `order` sequencing:
     - `order: 1` -> `.cardStreak` (Streak flame + 7-day row)
     - `order: 2` -> `.cardReview` (Repetition hero card with `50 CARDS TODAY` and prominent primary CTA pill `START REVIEW →`)
     - `order: 3` -> `.cardHeroVideo` (Featured video learning / resume banner)
     - `order: 4` -> `.cardSongs` (Compact Songs tile)
     - `order: 5` -> `.cardTexts` (Compact Texts tile)
     - `order: 6` -> `.cardSubtitles` (Compact Subtitles tile)
     - `order: 7` -> `.cardTelegram` (Compact Telegram Bot tile)
     - `order: 8` -> `.cardVault` (Dictionary summary card)

2. **Compact 2x2 Format Tiles (`@media (max-width: 768px)`)**:
   - Set `.bentoGrid` on mobile to `grid-template-columns: repeat(2, 1fr)` with `10px` gap.
   - Streak, Review, Video, and Vault cards span 2 columns (`grid-column: span 2`).
   - The 4 secondary format cards (`Songs`, `Texts`, `Subtitles`, `Telegram`) span 1 column each (`grid-column: span 1`), naturally forming an elegant 2x2 grid.
   - For secondary cards on mobile:
     - Hide the verbose 3-line `.cardDescription` (`display: none;`).
     - Display `.formatHeaderLeft` as a vertical stack: 36px `.iconSquircle` on top, bold 14.5px `.cardTitle` below.
     - Position `.quietChevron` top-right as an elegant indicator.
     - Ensure minimum 105px tactile touch target per tile.

3. **Hero Daily Review Call-to-Action**:
   - On mobile, elevate `.cardReview .inlineAction` into a tactile, high-contrast `#0A0A0A` pill button with `#F5F3EF` text and soft shadow, giving the user an instant, thumb-friendly target to begin their daily card review.

4. **Tablet Alignment (`@media (max-width: 1180px)`)**:
   - Ensure the same logical ordering applies on tablet: Row 1 has `Streak` + `Review` side-by-side (span 6 each), Row 2 has `Hero Video` (span 12), Row 3 & 4 have the 4 formats (span 6 each), Row 5 has `Vault` (span 12).
   - Zero disruption to the desktop 12-column layout.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/49_pixzen_dashboard_mobile_ux_redesign.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DashboardPage/css/DashboardPage.module.css`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.test.tsx`

---

## 4. Verification Checklist

1. `npm test -- src/components/DashboardPage/DashboardPage.test.tsx --watchAll=false` passes cleanly.
2. `npx tsc --noEmit` in `substreamedu-frontend` produces 0 errors.
3. `npx eslint src/components/DashboardPage/DashboardPage.tsx src/components/DashboardPage/DashboardPage.test.tsx` produces 0 warnings/errors.
