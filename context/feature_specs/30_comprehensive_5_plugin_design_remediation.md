# Feature Spec 30: Comprehensive 5-Plugin Design Audit Remediation (Design Lint, Stark, Adee, Attention Insight, Spell Checker)

## 1. Goal
Remediate all findings uncovered by the 5-plugin design audit (**Design Lint**, **Stark**, **Adee**, **Attention Insight**, **Spell Checker**) across `substreamedu-frontend/src` to achieve strict compliance with `/context/ui_context.md`, `/context/code_standards.md`, and WCAG 2.1 AA accessibility standards.

---

## 2. Design & Architectural Decisions

1. **Design Lint (Global Tokens, Pure Black, Emojis, Gradients & Transitions)**:
   - Define missing CSS variables in `src/index.css` (`:root`): `--color-danger: #ef4444`, `--color-success: #22c55e`, `--rounded-xl: 16px`, `--color-surface-soft: #1a1917`, `--color-focus-ring: rgba(250, 249, 47, 0.65)`.
   - Unify `::selection` in `src/index.css` and remove duplicate/conflicting `::selection` blocks in `src/typography.css` and `VideoPlayerPopover.module.css`.
   - Remove unlisted `'Nunito'` fallback from `tailwind.config.js` and align `accent` tokens.
   - Replace banned `bg-[#0d0c0b] text-[#ede8e0]` in `LearningPage.tsx:22` with `bg-canvas text-ink`.
   - Replace pure `#000000` / `#000` backgrounds and text with `--color-canvas` (`#0d0c0b`).
   - Purge UI emojis in `App.tsx`, `ActivePractice.tsx`, `SongSearchPlayer.tsx`, `en.json`, `StreakShareModal.tsx`, and `VideoPlayerPopover.module.css` (`content: "✍"`), replacing with `lucide-react` icons or clean typography.
   - Replace banned neon purple/blue gradients in `VideoPlayerPopover.module.css` and `SubtitleSearchModal.module.css` with Warm Espresso surface/accent tokens.
   - Fix `DictionaryPage.module.css` to inherit `var(--font-body)` (`e-Ukraine`) and Warm Espresso palette tokens instead of `system-ui` and Tailwind Zinc.
   - Replace `Roboto` / `Inter` references in `Flashcard.module.css` and `StreakShareModal.tsx` with `e-Ukraine` / `JetBrains Mono`.
   - Replace `transition: all` declarations with explicit GPU/color property transitions (`transform`, `opacity`, `background-color`, `border-color`, `color`, `box-shadow`).

2. **Stark (WCAG 2.1 AA Contrast, Colorblindness, Sub-12px Type & Mobile Input Auto-Zoom)**:
   - Lighten `--color-mute` in `src/index.css` from `#666360` (`3.10:1` FAIL) to `#7e7972` (`4.52:1` PASS AA on `#141312` and `4.81:1` on `#0d0c0b`).
   - Fix `.link` in `src/typography.css:216-223` (remove low-contrast `color: #0045e6` override on dark canvas) and remove `text-primary` on `/learning` active nav link in `Header.tsx`.
   - Fix invisible hover/card text (`1.00:1` – `1.61:1`) in `VideoPlayerPopover.module.css` (`.subtitleButton:hover`, `.fabButton:hover`, `.toggleCardsFab:hover`, `.button:hover`, `.addToDictionaryButton`, `.cardBack .highlightedText`, `.cardBack .highlightedContext`).
   - Enforce `font-size: 16px` on mobile form inputs (`input, select, textarea`) in `src/index.css`, `ActivePractice.module.css`, `DictionaryPage.module.css`, and `VideoPlayerPopover.module.css` to prevent forced iOS Safari viewport zoom, and remove global `a { font-size: 12px }` override in `src/index.css`.
   - Raise sub-12px (`8.5px–11px`) text rules to a `12px` floor and increase `.text-body-sm` weight from `300` to `400`.
   - Add non-color visual cues (`✓` / `✗` prefix or distinct border style) for `ActivePractice` cloze blanks (`clozeBlankCorrect` / `clozeBlankIncorrect`) to support colorblind users.

3. **Adee (Touch Targets >= 44px Mobile / >= 24px Desktop, Keyboard Navigation & ARIA)**:
   - Expand undersized interactive controls (`LoginPage.module.css` `.changeEmailButton`, `App.tsx` toast dismiss, `ActivePractice.module.css` `.ttsButton` & `.hintButton`, `VideoPlayerPopover.module.css` `.imageCloseButton` & mobile `.quickPillButton`, `SubtitleSearchModal.module.css` mobile `.closeButton`, `DictionaryPage.module.css` `.actionIconBtn` & `.deleteGroupBtn`) to meet minimum hit target requirements.
   - Add accessible names (`aria-label`), `<label htmlFor>` bindings, and fix broken ARIA IDs (`id="login-title"` and `id="otp-helper"` in `LoginPage.tsx`, `Flashcard.tsx`, `Flashcards.tsx`, `ActivePractice.tsx`, `TextPasteHighlighter.tsx`, `DictionaryPage.tsx`, `SubtitleSearchModal.tsx`, `App.tsx`).
   - Add keyboard accessibility (`role="slider"`, `tabIndex={0}`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow`, and arrow-key seeking on `VideoControlsOverlay.tsx` seek bar; `onKeyDown` handlers on `DashboardPage.tsx` streak pill, `DictionaryPage.tsx` category cards, `Flashcard.tsx` interactive elements, and `HomePage.tsx` blurred subtitle toggle).
   - Add `aria-expanded` to mobile menu trigger and fix invalid `<li>` inside `<div>` in `Header.tsx`.
   - Add `role="dialog"`, `aria-modal="true"`, and Escape key handler to `SubtitleSearchModal.tsx`.
   - Replace bare `outline: none` rules with visible `:focus-visible` outlines using `var(--color-focus-ring)`.

4. **Attention Insight (Visual Hierarchy, Primary CTA Focus & Information Density)**:
   - **HomePage & Header**: Make the Hero primary CTA (`.btnPrimary` "Watch demo") use the primary `#faf92f` accent fill while demoting `.signUpButton` on the unauthenticated landing header to a subtle elevated surface pill so the hero CTA commands first fixation.
   - **DashboardPage**: Remove the duplicate `.arrowPill` button adjacent to `.heroPrimaryBtn` ("Continue") in `.cardHeroVideo`, and harmonize off-palette inline colors (`#60a5fa`, `#94a3b8`) with design system tokens.
   - **DictionaryPage**: Reserve solid `#faf92f` for the primary AI action (`.categorizeBtn`), styling active view/filter toggles (`.segmentedButtonActive`, `.categoryFilterBtnActive`, `.layoutButtonActive`) with elevated surface `#242220` and `#ede8e0` text/border.
   - **TranslationPopover**: Demote the secondary `REEL` button from bright `#FF385C` crimson to a subtle bordered secondary pill so the `SAVE` button remains the undisputed primary action.
   - **Flashcards & ActivePractice**: Replace off-palette gold gradients (`#f0c674` / `#e6b800`) and purple spinner (`#a855f7`) with design system tokens (`#faf92f` / `#ede8e0`), and add visible text labels to the 3 story mode tabs in `Flashcards.tsx`.

5. **Spell Checker (Localization Keys, Pricing Table Bug, Typos & Copywriting)**:
   - **Pricing Table Fix (`HomePage.tsx:734`)**: Fix the Free tier 3rd bullet to use `homePage.pricing.free.feature3` (`"Google Translate (no context)"`) and add `homePage.pricing.premium.feature3` (`"Contextual AI translation"`) to the Premium tier card.
   - **Missing & Mismatched Keys (`en.json`, `DashboardPage.tsx`, `Header.tsx`, `VideoPage.tsx`)**:
     - Align `DashboardPage.tsx` description keys (`dashboard.learningDesc`, etc.) and numbered eyebrow tags (`01 // INSTANT SRS` – `07 // TELEGRAM BOT`) with `src/locales/en.json`.
     - Add `telegramChannelMenu` (`"Telegram Bot"`), `videoPage.subtitleUploadError`, and all missing component translation keys into `src/locales/en.json`.
   - **Grammar, Typos & Banned AI Words**:
     - Fix `"text,then"` → `"text, then"` in `src/locales/en.json:182`.
     - Replace banned word `"Unlock"` in `src/locales/en.json:259`, `SubscribePage.tsx:55`, and `PremiumLimitModal.tsx:46`.
     - Fix `"Listen pronunciation on YouGlish"` → `"Listen to pronunciation on YouGlish"` in `DictionaryPage.tsx:812` and standardize `'YouGlish'` in `HomePage.tsx:317` and `'How to upload a video?'` in `HomePage.tsx:269, 367`.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-frontend/src/index.css`
- `substreamedu-frontend/src/typography.css`
- `substreamedu-frontend/tailwind.config.js`
- `substreamedu-frontend/src/locales/en.json`
- `substreamedu-frontend/src/App.tsx`
- `substreamedu-frontend/src/components/Header.tsx` & `Header.module.css`
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx` & `HomePage.module.css`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`, `css/DashboardPage.module.css`, `components/StreakShareModal.tsx`, `components/StreakShareModal.module.css`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx` & `DictionaryPage.module.css`
- `substreamedu-frontend/src/components/LearningPage/LearningPage.tsx`, `Flashcards.tsx`, `Flashcards.module.css`, `Flashcard.tsx`, `Flashcard.module.css`, `ActivePractice.tsx`, `ActivePractice.module.css`
- `substreamedu-frontend/src/components/VideoPage/VideoPage.tsx`, `VideoPlayer.tsx`, `css/VideoPage.module.css`, `css/VideoPlayerPopover.module.css`, `components/VideoControlsOverlay.tsx`, `components/SubtitleSearchModal.tsx`, `components/SubtitleSearchModal.module.css`
- `substreamedu-frontend/src/components/shared/TranslationPopover.tsx`
- `substreamedu-frontend/src/components/LoginPage/LoginPage.tsx` & `css/LoginPage.module.css`
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.tsx`
- `substreamedu-frontend/src/components/Subscribe/SubscribePage.tsx`
- `substreamedu-frontend/src/components/PremiumLimitModal.tsx`
- `substreamedu-frontend/src/components/ui/modal.module.css`

### What NOT to Touch:
- Go backend services (`substreamedu-*-go`).
- Database migrations or Docker compose files.

---

## 4. Verification Checklist
- [x] All frontend unit tests pass (`npm test -- --watchAll=false`).
- [x] Production frontend build succeeds (`npm run build`).
- [x] Zero undefined CSS variables (`--color-focus-ring`, `--color-surface-soft`, `--color-danger`, `--color-success`, `--rounded-xl`) in `src/index.css`.
- [x] Zero invisible hover states (`1.00:1`) in `VideoPlayerPopover.module.css`.
- [x] Pricing table in `HomePage.tsx` accurately distinguishes Free vs Premium features.
