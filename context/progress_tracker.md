# SubStreamEdu: Progress Tracker

## Status Board

- **Current Phase**: Phase 2: Product Feature Expansion & Engineering Excellence
- **In Progress**: None
- **Backlog**: None
- **Recent Completed**:
  - Spec 70: FSRS Spaced Repetition Workflow, Recall Latency & Dashboard Stats Alignment (ADR-145): Fixed pre-reveal recall latency measurement in `useFlashcardsSession.ts` (`answerShownTime - cardStartTime` instead of post-reveal reading time); enforced 1-day next-day reinforcement interval on all first-time graduations (`RepetitionLevel == 0`), guarded against intra-session failure `EASY` bonuses (`HardCount > 0`), and added dedicated FSRS-4.5 `W15`/`W16` weights in `fsrs/engine.go`; added timezone-aware `ReviewCardWithLocation` / `LocalReviewTimestamp` in `learning_service.go` and `dictionary_handler.go`; aligned `GetDictionaryStats` (`ComputeGatedSessionNewCards`) and `findUnlockedNewProductionCardsSQL` so Production cards unlock on the day after Recognition graduation and Dashboard `CARDS TODAY` matches `/learning`; and updated `deriveDashboardMetrics` (`dashboardUtils.ts`) so `isAllCaughtUp` reflects `sessionCardsCount === 0` (Frontend 67/67 suites 352/352 tests passing, Go suites clean).
  - Spec 69: Dictionary Collection Page (`DictionaryItemsPage`) Pixzen Light Editorial Redesign & Humble Object Architecture (ADR-144): Integrated `usePixzenTheme()` and `.pixzenGrain` into `DictionaryItemsPage.tsx` so `/dictionary/resources/:resourceName` and the top `Header` render in the light Pixzen monochrome editorial theme; redesigned `DictionaryItemsPage.module.css` (`#f5f3ef` canvas, `#eae7e1` soft-stone 3D flip flashcard and term rows, `#0a0a0a` primary ink, `#4a4a48` secondary text, `#8e8e8e` JetBrains Mono metadata, pill `Anki Export` CTA, tactile circle controls, `@media (hover: hover)` and `prefers-reduced-motion` support); and decomposed `DictionaryItemsPage.tsx` from 564 lines down to a 233-line Humble Object (`DictionaryItemsPage.tsx` + `useDictionaryItemsSession.ts` + `DictionaryTermsList.tsx`) with unit tests in `DictionaryItemsPage.test.tsx` (Frontend 67/67 suites 350/350 tests passing, Go suites clean).
  - Spec 68: Books Page Complete Editorial Redesign, Localization & Humble Object Architecture (ADR-143): Fixed fixed-navbar clipping on `/books` (`padding: 96px 48px 72px`, `max-width: 1560px`) and `/books/:bookId` (`padding-top: 64px`, `top: 64px`); replaced pastel banner cards and fake `0%` progress bars with the Pixzen Literary Studio aesthetic (`BookContinueDesk.tsx` Reading Desk hero with live chapter excerpt preview + `BookFolioCard.tsx` soft-stone `#eae7e1` Bento cards with 3D hardcover book covers, `.bookSpineCrease`, and smart footer showing progress bars only when `percentage > 0`); and decomposed `BooksCatalogPage.tsx` from 388 lines into a 249-line Humble Object (Frontend 66/66 suites 345/345 tests passing, Go suites clean).
  - Spec 67: Dashboard Multi-Skill Audit, Polish & Humble Object Architecture (ADR-142): Decomposed 495-line `DashboardPage.tsx` into a 90-line Humble Object (`DashboardPage.tsx` + pure `dashboardUtils.ts`, `useDashboardData.ts` hook, `DashboardFormatCards.tsx`, `DashboardTelemetryCards.tsx`); fixed 1-click video resume in `cardHeroVideo` (`/videos?videoUrl=...` when `latestRecentVideo` exists); localized `to review` and `new` card counts in Daily Review widget; refactored `WelcomeModal.tsx` to eliminate 120+ lines of inline `style={{...}}` and imperative DOM mutations in favor of CSS Modules, `role="dialog"`, `aria-modal="true"`, close button, and `Escape` key dismissal; and upgraded `DashboardPage.module.css` with `@media (hover: hover) and (pointer: fine)` gating, `cubic-bezier(0.23, 1, 0.32, 1)` transitions, `:active` press scale (`0.985`), and `@media (prefers-reduced-motion: reduce)` support (Frontend 66/66 suites 344/344 tests passing, Go suites clean).
  - Spec 66: Homepage Multi-Skill Audit, Polish & Humble Object Architecture (ADR-141): Decomposed 1074-line `HomePage.tsx` into a 227-line Humble Object (`HomePage.tsx` + `homePageData.tsx`, `HomeInteractiveDemoSection.tsx`, `HomePricingSection.tsx`, `HomeReviewsFaqSection.tsx`, `HomeDemoModal.tsx`); upgraded `HeroCinemaPlayer` with interactive Grammar Spotlight (`Sparkles` toggle + `.grammarBadge`), `3x` Repeat (`aria-pressed`), keyboard `Enter`/`Space` subtitle reveal, GPU spring easing (`cubic-bezier(0.23, 1, 0.32, 1)`), `:active` press scale (`0.97`), `@media (hover: hover) and (pointer: fine)` gating, and `tabular-nums` timecodes; added Graded Books (`/books`) to the hero demo dock and marquee; fixed `.btnPrimary` contrast token (`var(--black, #f5f3ef)`); and audited copy against `unslop` and `landing-page-design` (Frontend 66/66 suites 341/341 tests passing, Go suites clean).
  - Spec 65: Nick Vels Autopilot Skill & Project Integration (ADR-140): Installed `autopilot` (`v2.2.1`) from `nick-vels/skills` into `.agents/skills/autopilot/`, registered `/autopilot` workflow in `.agents/workflows/autopilot.md` and `skills-lock.json`, appended `<!-- autopilot:start -->` project memory block to `AGENTS.md` with `@AGENTS.md` pointer in `CLAUDE.md`, expanded `CONTEXT.md` with SubStreamEdu's ubiquitous domain glossary and anti-synonyms (`_Избегать_`), and provisioned `.autopilot/` (`dashboard.html`, `ap.py`, `state.js`, `README.md`, `PROGRESS.md`) with a completed G1–G4 verified run.
  - Spec 64: Homepage Hero Cinema Player Mockup & Instant Comprehension (ADR-139): Integrated interactive glassmorphic `HeroCinemaPlayer` directly into the public homepage Hero section. Added live subtitle blur with click/tap-to-reveal (Active Listening mode demonstration), cursor selection for idioms (`call it a day`, `nuts and bolts`, `crumbles`), docked contextual translation card with phonetics, definition and instant "Save to SRS" feedback, and content format switcher (Movies, YouTube, Synced Lyrics) allowing visitors to comprehend the product's core value within 3 seconds of landing. (Frontend 66/66 suites 340/340 tests passing, Go suites clean).
  - Spec 63: DictionaryRepository Clean Architecture & SRP Refactoring (ADR-138): Decomposed 973-line monolithic `dictionary_repository.go` into domain modules `dictionary_categorization_repository.go` (uncategorized lexemes, phrase categories, batch update, category pagination) and `dictionary_stats_repository.go` (SRS review logging, review dates timezone projection, dictionary stats, and resets), reducing `dictionary_repository.go` to 602 lines (~38% reduction) with zero breaking changes and 100% ABI compatibility.
  - Spec 62: DictionaryHandler Clean Architecture & SRP Refactoring (ADR-137): Decomposed 1156-line monolithic `dictionary_handler.go` into domain modules `dictionary_ai_handler.go` (AI generation & timeouts), `dictionary_translation_handler.go` (translation, field mapping & visual icon fetch), `dictionary_lesson_handler.go` (teacher lesson plan builder & sharing), `dictionary_export_handler.go` (CSV & Anki export streaming), and `dictionary_categorization_handler.go` (micro-batch categorization & categories), reducing `dictionary_handler.go` to 466 lines (>60% reduction) with zero breaking changes or regressions across all routes.
  - Spec 61: VocabularyService Clean Architecture & SRP Refactoring (ADR-136): Decomposed 1212-line monolithic `vocabulary_service.go` into domain modules `vocabulary_export.go` (Anki packaging & CSV streaming), `vocabulary_image_downloader.go` (safe async image downloading & SSRF protection), and `vocabulary_stats.go` (streak & SRS calculation), reducing `vocabulary_service.go` to 474 lines (>60% reduction) with zero regressions across all services.
  - Spec 60: AIService Clean Architecture & SRP Refactoring (ADR-135): Decomposed 3055-line God Object `ai_service.go` into focused domain modules (`ai_provider_client.go`, `ai_grammar_fallback.go`, `ai_exercise_generator.go`, `ai_lesson_generator.go`, `ai_categorizer.go`, `ai_prompts.go`) backed by characterization unit tests (`ai_grammar_fallback_test.go`, `ai_lesson_generator_test.go`, `ai_prompts_test.go`), reducing `ai_service.go` to 1216 lines (>60% reduction) with zero breaking changes or regressions across all services.
  - Spec 59: VideoPlayer Humble Object & SRP Refactoring (ADR-134): Decomposed 1523-line monolithic `VideoPlayer.tsx` into domain hooks `useVideoSubtitles.ts`, `useVideoOnboarding.ts`, `useVideoModalsState.ts`, and `useWordTooltip.ts` with comprehensive unit tests (Frontend 66/66 suites 339/339 tests passing, Go suites clean).
  - Spec 58: Dictionary Page Humble Object & SRP Refactoring (ADR-133): Decomposed 1355-line monolithic `DictionaryPage.tsx` into domain hook `useDictionaryData.ts`, search/pagination hook `useDictionarySearchPagination.ts`, pure utility `dictionaryUtils.tsx` with unit tests, and isolated subcomponents `DictionaryWordCard`, `DictionaryResourceCard`, `DictionaryPagination`, and `DictionaryEditModal` (Frontend 62/62 suites 325/325 tests passing, Go suites clean).
  - Spec 57: Flashcards Humble Object & SRP Refactoring (ADR-132): Decomposed 999-line monolithic `Flashcards.tsx` into focused domain hook `useFlashcardsSession.ts`, keyboard event seam `useFlashcardsKeyboard.ts`, and pure string highlighting utility `storyHighlightUtils.ts` with comprehensive unit tests (Frontend 61/61 suites 318/318 tests passing, Go suites clean).
  - Uncle Bob `ub-mode` Adoption & `parseDoTags` Dryer Refactoring (ADR-131): Integrated Uncle Bob's `ub-mode` skill and workflow into `.agents/`; extracted duplicated `parseDoTags` string parser across `DashboardPage`, `VideoPage`, and `DictionaryPage` into pure utility `src/utils/textUtils.tsx` backed by seam tests in `textUtils.test.tsx` (60/60 suites 312/312 tests passing).
  - Spec 56: Learning Session Motivation & Workload Reduction (ADR-129, ADR-130): removed the Start Learning gate (audio unlocks on first gesture), monotonic Good-based progress bar, checkpoint after 20 ratings (Finish for today / Keep going), progress spark and halfway milestone with reduced-motion support, fade+slide card transition without `mode="wait"`, skippable story stage, localized finish copy; gated new production cards behind recognition mastery in `GetDailyCards` with fallback and flag `SRS_GATE_PRODUCTION_CARDS` (Frontend 59/59 suites 307/307 tests passing, Go suites clean).
  - Spec 55: Book-Based Language Learning & Interactive Reader (ADR-128): Curated CEFR graded readers (A1–C1), client-side IndexedDB storage engine (`substreamedu_books_db`) with memory fallback for custom books & reading progress, browser-based EPUB (JSZip + DOMParser) & TXT parsers, Warm Cinematic Espresso styling tokens, tokenized interactive reader with `TranslationPopover` & `useSaveWord` integration identical to `SubtitleViewer`, table of contents drawer, font scale toolbar, `/books` & `/books/:bookId` routes, desktop/mobile navigation header link, and dashboard bento grid integration (Frontend 59/59 suites 300/300 tests passing).
  - Spec 54: AI Harness & SDD Workflow Modernization (ADR-127): purged 39 MB stale `ai_agent_setup/` directory; archived 202 KB `progress_tracker.md` to `context/archive/progress_tracker_history.md`; added machine-enforced `.harness/` scripts (`check-protected-files.sh`, `check-spec-scope.sh`, `devin-pre-exec.sh`); curated `.agents/skills/` (added `spec-writer`, `fast-fix`, `scout`, `cross-service-change`); unified Definition of Done via `./verify.sh` and `make verify`; updated `AGENTS.md` to progressive disclosure model (< 5 KB) (Go suites clean, Frontend 54/54 suites 288/288 tests passing).
  - Subtitle Card Trash Button Editorial Redesign & Cross-Boundary Isolation (ADR-126)
  - Spec 53: Flashcards Completion Screen CSS Restoration (ADR-125)

  - SDLC Guardrails & Skills Integration from claude-sdlc (ADR-124)
  - Subtitle Sync Test Banner Contrast & Legibility Fix (ADR-123)
  - Spec 52: Flashcard Hover State & Broken Image Fallback Suppression (ADR-122)
  - Spec 51: Subtitle Video Performance Optimization (ADR-121)

> Historical task logs (ADR-001 through ADR-120) have been archived to [`context/archive/progress_tracker_history.md`](file:///Users/test/Desktop/substreamedu-go/context/archive/progress_tracker_history.md).

---

## Architectural Decisions Log (Recent)

### ADR-145: FSRS Spaced Repetition Workflow, Recall Latency & Dashboard Stats Alignment (Spec 70)
- **Status**: Accepted
- **Context**: A user reported having 1 word in the dictionary that they marked as known ("Знаю") yesterday, yet seeing `0 CARDS TODAY` with a `START REVIEW ->` action on `/dashboard` today. Root-cause analysis across `substreamedu-dictionary-service-go` and `substreamedu-frontend` uncovered 5 compounding issues: (1) `useFlashcardsSession.ts` measured `responseTimeMs` after flipping the card (`Date.now() - answerShownTime`) instead of pre-flip recall time (`answerShownTime - cardStartTime`), causing `< 1s` post-flip confirmation clicks to be classified as `EASY` (`< 3000ms`); (2) `fsrs/engine.go` scheduled `EASY` on first graduation (`RepetitionLevel == 0`) for `interval = 2` days (skipping Day 2), allowed cards with intra-session failures (`HardCount > 0`) to receive `EASY`, and reused post-lapse weights `W11`/`W12` in `calculateNewStability`; (3) `GetDictionaryStats` counted `status = 'new'` without applying the Production Gate (`SRS_GATE_PRODUCTION_CARDS`), while `findUnlockedNewProductionCardsSQL` unlocked Production cards on the same day their Recognition sibling graduated; (4) `ReviewCard` used UTC calendar dates instead of the user's `X-Timezone` location; and (5) `deriveDashboardMetrics` in `dashboardUtils.ts` set `isAllCaughtUp = !isNewUser && reviewedToday && dueCount === 0`, rendering a dead-end `0 CARDS TODAY / START REVIEW ->` state when `sessionCardsCount === 0` and `reviewedToday === false`.
- **Decision**:
  1. Updated [`useFlashcardsSession.ts`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/LearningPage/hooks/useFlashcardsSession.ts) to compute `responseTimeMs` as `(answerShownTime ?? Date.now()) - cardStartTime` and reset `answerShownTime` on card change.
  2. Updated [`fsrs/engine.go`](file:///Users/test/Desktop/substreamedu-go/substreamedu-dictionary-service-go/internal/service/fsrs/engine.go) to schedule all first-time graduations (`RepetitionLevel == 0`) at `interval = 1` day (preserving higher initial stability `1.5` for genuine first-try `EASY`), cap `grade` at `GOOD` when `HardCount > 0` during graduation, add `ReviewAt`, and use FSRS-4.5 `W15 = 0.29` / `W16 = 2.61` in `calculateNewStability`.
  3. Added `LocalReviewTimestamp` and `ReviewCardWithLocation` in [`learning_service.go`](file:///Users/test/Desktop/substreamedu-go/substreamedu-dictionary-service-go/internal/service/learning_service.go) and wired `h.resolveLocation(c)` in [`dictionary_handler.go`](file:///Users/test/Desktop/substreamedu-go/substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go).
  4. Updated `findUnlockedNewProductionCardsSQL` in [`dictionary_repository.go`](file:///Users/test/Desktop/substreamedu-go/substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go) and `GetDictionaryStats` (`ComputeGatedSessionNewCards`) in [`dictionary_stats_repository.go`](file:///Users/test/Desktop/substreamedu-go/substreamedu-dictionary-service-go/internal/repository/dictionary_stats_repository.go) so Production cards stay locked on the day their Recognition sibling first graduates and Dashboard `CARDS TODAY` matches `GetDailyCards`.
  5. Updated `deriveDashboardMetrics` in [`dashboardUtils.ts`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/dashboardUtils.ts) so `isAllCaughtUp = !isNewUser && !statsLoading && sessionCardsCount === 0`.
- **Consequences**: Every newly learned word is deterministically scheduled for reinforcement the next day (`1 day`), Production cards unlock on Day 2 rather than immediately on Day 1, Dashboard card counts match `/learning` 1:1, and all Go and Frontend test suites pass `./verify.sh`.

### ADR-144: Dictionary Collection Page (`DictionaryItemsPage`) Pixzen Light Editorial Redesign & Humble Object Architecture (Spec 69)
- **Status**: Accepted
- **Context**: Navigating from `/dictionary` into a specific collection (`/dictionary/resources/:resourceName`, rendered by `DictionaryItemsPage.tsx`) switched the entire app back to the legacy dark theme (`#0a0a0a` header strip, `#111111` cards, `#2a2a2a` borders, `#e8e8e8` text) because `DictionaryItemsPage.tsx` never invoked `usePixzenTheme()` and `DictionaryItemsPage.module.css` retained legacy dark-mode styling. Additionally, `DictionaryItemsPage.tsx` was 564 lines, violating the ≤250-line Humble Object standard (`code_standards.md` §2.2).
- **Decision**:
  1. Activated `usePixzenTheme()` and added `<div className="pixzenGrain" aria-hidden="true" />` in [`DictionaryItemsPage.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DictionaryItemsPage/DictionaryItemsPage.tsx).
  2. Redesigned [`DictionaryItemsPage.module.css`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DictionaryItemsPage/css/DictionaryItemsPage.module.css) to match the Pixzen monochrome editorial light system (`#f5f3ef` page background, `#eae7e1` soft-stone 3D flip card and term list items, `#0a0a0a` ink, `#4a4a48` secondary text, `#8e8e8e` `JetBrains Mono` metadata, pill `Anki Export` button, `@media (hover: hover) and (pointer: fine)` gating, and `@media (prefers-reduced-motion: reduce)`).
  3. Decomposed `DictionaryItemsPage.tsx` from 564 lines down to 233 lines by extracting [`useDictionaryItemsSession.ts`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DictionaryItemsPage/useDictionaryItemsSession.ts) and [`DictionaryTermsList.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DictionaryItemsPage/DictionaryTermsList.tsx), backed by unit tests in [`DictionaryItemsPage.test.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DictionaryItemsPage/DictionaryItemsPage.test.tsx).
- **Consequences**: Seamless light editorial visual continuity between `/`, `/dictionary`, and `/dictionary/resources/:resourceName`; strict Humble Object compliance (<250 lines); all 67 frontend test suites (350 tests) pass `./verify.sh`.

### ADR-143: Books Page Complete Editorial Redesign, Localization & Humble Object Architecture (Spec 68)
- **Status**: Accepted
- **Context**: A visual critique (`visual-critique`, `tastemaker`, `design-taste-frontend`, `impeccable`, `emil-design-eng`, `better-layout`, `better-ui`, `ub-mode`) of `/books` (`BooksCatalogPage.tsx`, `BooksCatalog.module.css`, `BookReader.module.css`) identified: (1) top navbar clipping where `.contentWrapper` used `padding: 40px 24px 80px`, causing the fixed `64px` top header to slice `"✦ GRADED EXTENSIVE READING"` in half (and `.readerHeader` at `top: 0` overlapped the fixed navbar on `/books/:bookId`); (2) generic AI-slop card visuals where `BooksCatalog.module.css` overrode every book's distinct `coverGradient` with pastel mint/amber/purple washes and a tilted `<BookOpen size={64} />` watermark; (3) fake empty `0%` progress bars rendered on unread books; (4) missing Reading Desk hero hierarchy on the catalog view; and (5) `BooksCatalogPage.tsx` was 388 lines (exceeding the 250-line Humble Object threshold).
- **Decision**:
  1. Fixed fixed-navbar clearance and container geometry in [`BooksCatalog.module.css`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/BooksPage/css/BooksCatalog.module.css) (`max-width: 1560px; padding: 96px 48px 72px` on desktop, `80px 16px 56px` on mobile) and [`BookReader.module.css`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/BooksPage/css/BookReader.module.css) (`padding-top: 64px` on `.readerContainer`, `top: 64px` on `.readerHeader`).
  2. Created [`BookContinueDesk.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/BooksPage/components/BookContinueDesk.tsx) to render a featured **Reading Desk** Bento hero card showing either the user's active in-progress book (`Resume: ...`) or a recommended starter classic (`The Little Prince`), complete with a 3D hardcover book cover, live open-page chapter excerpt preview, and 1-click actions.
  3. Created [`BookFolioCard.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/BooksPage/components/BookFolioCard.tsx) with soft-stone `#eae7e1` Bento surfaces, tactile 3D hardcover miniature covers using `book.coverGradient` + `.bookSpineCrease` + right-edge paper pages, and a smart footer that renders a progress bar only when `percentage > 0` (and clean word count + first chapter title when unread).
  4. Decomposed [`BooksCatalogPage.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/BooksPage/BooksCatalogPage.tsx) from 388 lines down to 249 lines.
- **Consequences**: Zero navbar clipping on `/books` or `/books/:bookId`; cohesive Pixzen Literary Studio aesthetic matching `/` and `/dashboard`; strict Humble Object compliance (<250 lines); all 66 frontend test suites (345 tests) and Go services pass `./verify.sh`.

### ADR-142: Dashboard Multi-Skill Audit, Polish & Humble Object Architecture (Spec 67)
- **Status**: Accepted
- **Context**: A multi-skill audit (`ub-mode`, `react-conventions`, `codebase-design`, `emil-design-eng`, `perception-laws`, `better-accessibility`, `better-typography`, `better-ui`, `tdd`) of `/dashboard` (`src/components/DashboardPage/`) revealed: (1) `DashboardPage.tsx` was 495 lines (violating the ≤250-line Humble Object rule in `code_standards.md` §2.2); (2) when `latestRecentVideo` existed, `cardHeroVideo` displayed `"Resume Watching"` and the video's title but linked to `"/videos"` instead of `"/videos?videoUrl=..."`; (3) `${dueCount} to review` and `${newCardsCount} new` in the Daily Review card were hardcoded in English; (4) `WelcomeModal.tsx` used 120+ lines of raw inline `style={{...}}` objects, imperative `e.currentTarget.style` mutations, and raw `lucide-react/dist/esm/icons/*` imports, and lacked `role="dialog"`, `aria-modal="true"`, a close button, and `Escape` key dismissal; and (5) `DashboardPage.module.css` lacked `@media (hover: hover) and (pointer: fine)` hover gating and `@media (prefers-reduced-motion: reduce)` rules.
- **Decision**:
  1. Decomposed [`DashboardPage.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx) from 495 lines down to 90 lines (~82% reduction) by extracting pure [`dashboardUtils.ts`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/dashboardUtils.ts), stateful [`useDashboardData.ts`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/useDashboardData.ts) (with batched async state update), [`DashboardFormatCards.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/components/DashboardFormatCards.tsx), and [`DashboardTelemetryCards.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/components/DashboardTelemetryCards.tsx).
  2. Fixed 1-click video resume in `getHeroVideoTargetUrl`: when `latestRecentVideo?.videoUrl` is a valid HTTP(S) URL, `cardHeroVideo` links directly to `/videos?videoUrl=${encodeURIComponent(latestRecentVideo.videoUrl)}`.
  3. Localized `{count} to review` and `{count} new` via `intl.formatMessage` and added `aria-busy={statsLoading}` and weekly consistency `role="group"` + `data-active`/`data-today` attributes.
  4. Refactored [`WelcomeModal.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/components/WelcomeModal.tsx) to use CSS Modules in [`DashboardPage.module.css`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/DashboardPage/css/DashboardPage.module.css), `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a close button, and `Escape` key dismissal.
  5. Added `@media (hover: hover) and (pointer: fine)` hover gating, `cubic-bezier(0.23, 1, 0.32, 1)` transitions, `:active { transform: scale(0.985) }`, and `@media (prefers-reduced-motion: reduce)` rules in `DashboardPage.module.css`.
- **Consequences**: `DashboardPage.tsx` is a clean 90-line Humble Object; 1-click video resume works seamlessly from `/dashboard`; `WelcomeModal` is 100% CSS-Module-driven and keyboard-accessible; all 66 frontend test suites (344 tests) and Go services pass `./verify.sh`.

### ADR-141: Homepage Multi-Skill Audit, Polish & Humble Object Architecture (Spec 66)
- **Status**: Accepted
- **Context**: A comprehensive multi-skill audit (`ub-mode`, `react-conventions`, `emil-design-eng`, `landing-page-design`, `unslop`, `perception-laws`, `better-accessibility`, `better-typography`) of the public homepage (`src/components/HomePage/`) revealed: (1) `HomePage.tsx` was 1,074 lines, violating the 250-line Humble Object threshold in `code_standards.md` §2.2; (2) in `HeroCinemaPlayer.tsx`, the Grammar Spotlight (`Sparkles`) and `3x` Repeat controls were static and `.grammarBadge` CSS was unused; (3) `HeroCinemaPlayer.module.css` used `transition: all 0.2s ease`, lacked `transform-origin: bottom center` on `.popover`, and lacked `@media (hover: hover) and (pointer: fine)` gating; (4) `HomePage.module.css` `.btnPrimary` used `color: var(--color-canvas, #0d0c0b)` which caused low-contrast text on `#141413` surfaces before `body.pixzen` mounted; and (5) Graded Books (`/books`) was missing from the instant hero demo dock and marquee.
- **Decision**:
  1. Decomposed [`HomePage.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomePage.tsx) from 1,074 lines down to 227 lines by extracting [`homePageData.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/homePageData.tsx), [`HomeInteractiveDemoSection.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomeInteractiveDemoSection.tsx), [`HomePricingSection.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomePricingSection.tsx), [`HomeReviewsFaqSection.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomeReviewsFaqSection.tsx), and [`HomeDemoModal.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomeDemoModal.tsx).
  2. Made [`HeroCinemaPlayer.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.tsx) controls fully interactive: clicking `Grammar in this Video` toggles a contextual CEFR grammar insight badge (`styles.grammarBadge`) with `aria-pressed`; clicking `3x` toggles 3x auto-loop mode (`aria-pressed`); pressing `Enter` or `Space` on blurred subtitle words reveals them for keyboard users.
  3. Upgraded [`HeroCinemaPlayer.module.css`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.module.css) with explicit property transitions (`cubic-bezier(0.23, 1, 0.32, 1)`), `:active { transform: scale(0.97) }`, `transform-origin: bottom center` on `.popover`, `@media (hover: hover) and (pointer: fine)` hover gating, and `font-variant-numeric: tabular-nums` on timecodes.
  4. Added Graded Books (`/books`) to `hero-demo-dock` and the sources marquee, fixed `.btnPrimary` contrast (`var(--black, #f5f3ef)`), and removed AI copy tells (`unslop`).
- **Consequences**: `HomePage.tsx` strictly adheres to the <250-line Humble Object standard; every control in the Hero Cinema Player is genuinely interactive and keyboard-accessible; all 66 frontend test suites (341 tests) and Go services pass `./verify.sh`.

### ADR-140: Nick Vels Autopilot Skill & Project Integration (Spec 65)
- **Status**: Accepted
- **Context**: The team requested installing the `autopilot` development framework skill from `https://github.com/nick-vels/skills/` (`v2.2.1`) and applying its end-to-end orchestration, project memory, ubiquitous glossary, and live dashboard telemetry to the SubStreamEdu repository while preserving existing SDD guardrails.
- **Decision**:
  1. Installed `.agents/skills/autopilot/` (`SKILL.md`, 16 phase guides in `phases/`, `phases/dashboard-template.html`, subagent prompts in `prompts/`, and `tools/ap.py`), added `.agents/workflows/autopilot.md`, and locked `autopilot` in `skills-lock.json`.
  2. Appended the `<!-- autopilot:start --> ... <!-- autopilot:end -->` memory block to `AGENTS.md` (verified commands, microservice pointers, known traps, environment variable names, «Правка без автопилота», and «История git») without modifying existing SDD rules, and created `CLAUDE.md` (`@AGENTS.md`).
  3. Expanded `CONTEXT.md` with the Autopilot Ubiquitous Glossary (`Лексема`, `Карточка распознавания`, `Карточка воспроизведения`, `FSRS`, `Режим активного аудирования`, `Ресурс`, `Transactional Outbox`, `Humble Object`) and explicit `_Избегать_` anti-synonyms.
  4. Provisioned `.autopilot/` (`dashboard.html`, `index.html`, `ap.py`, `state.js`, `README.md`, `PROGRESS.md`) and completed the initial G1–G4 verified baseline flight (`2026-11-02-substreamedu-autopilot-integration`).
- **Consequences**: Full `/autopilot` workflow and offline self-updating HTML dashboard available in the repository; instant zero-reconnaissance onboarding for future AI sessions via `AGENTS.md` / `CLAUDE.md` / `CONTEXT.md` / `.autopilot/PROGRESS.md`; 100% compatibility with `.harness/` and `./verify.sh`.

### ADR-139: Homepage Hero Cinema Player Mockup & Instant Comprehension (Spec 64)
- **Status**: Accepted
- **Context**: Visitors to the public homepage needed to grasp the core mechanic within 3 seconds of landing. While the typography and value proposition were strong, the hero section lacked a visual mockup of the actual video player with blurred subtitles and contextual phrase translation. Additionally, demonstration vocabulary needed to translate identically into Ukrainian and Russian to feel natural to both audiences.
- **Decision**:
  1. Built [`HeroCinemaPlayer`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HeroCinemaPlayer.tsx) and mounted it directly inside the hero content below the primary CTAs.
  2. Implemented interactive subtitle blur with click/tap-to-reveal for Active Listening mode demonstration.
  3. Added live idiom/word highlighting with bilingual-identical vocabulary (`no problem` → `без проблем`, `suit` → `костюм`, `castle` → `замок`), docked floating translation card, phonetics, and interactive "Save to SRS" state feedback.
  4. Provided a 3-source tab switcher (Movies & Series, YouTube Interviews, Synced Lyrics) demonstrating all primary content formats directly on the hero screen.
  5. Added comprehensive test coverage in [`HomePage.test.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/HomePage/HomePage.test.tsx).
- **Consequences**: Immediate 3-second comprehension of the product, highly engaging micro-interactions, seamless bilingual resonance (UK/RU), responsive on both desktop and mobile, with zero regressions across the codebase.

### ADR-138: DictionaryRepository Clean Architecture & SRP Refactoring (Spec 63)
- **Status**: Accepted
- **Context**: `dictionary_repository.go` in `substreamedu-dictionary-service-go` was 973 lines long, combining word CRUD, optimistic locking, SRS review logging, SQL stats calculations with session limits, uncategorized word queries, phrase categories, and category pagination into a single file.
- **Decision**:
  1. Extracted vocabulary categorization methods (`FindUncategorizedLexemes`, `CountCategorizationStats`, `FindGlobalPhraseCategories`, `SaveGlobalPhraseCategories`, `BatchUpdateCategories`, `FindVocabularyCategories`, `FindLexemesByCategoryPaginated`) into `internal/repository/dictionary_categorization_repository.go`.
  2. Extracted SRS review logging, review dates timezone projection, dictionary stats, and user/global resets into `internal/repository/dictionary_stats_repository.go`.
  3. Kept core CRUD (`FindByID`, `Save`, `SaveTx`, `SaveTxOptimistic`, `DeleteWord`, `DeleteByResource`, `UpdateImageUrl`), card selection (`FindDueWordsSorted`, `FindRandomNewWords`, `FindNewRecognitionCards`, `FindUnlockedNewProductionCards`), and resource lexeme queries in `internal/repository/dictionary_repository.go` (602 lines).
  4. Preserved all method signatures on `*DictionaryRepository` ensuring 100% ABI compatibility with `VocabularyService`, `CategorizationService`, and `LearningService`.
- **Consequences**: Strict SRP separation, high readability and maintainability, zero regressions across tests.

### ADR-137: DictionaryHandler Clean Architecture & SRP Refactoring (Spec 62)
- **Status**: Accepted
- **Context**: `dictionary_handler.go` in `substreamedu-dictionary-service-go` was 1156 lines long, combining translation/visual keyword fetching, AI content and grammar generation with timeout wrappers, teacher lesson plan management, CSV/Anki export streaming, and user vocabulary categorization into a single handler.
- **Decision**:
  1. Extracted AI text, question, summary, practice, and grammar analysis handlers with 15s deadline context into `internal/handler/dictionary_ai_handler.go`.
  2. Extracted translation and NounProject visual icon fetching into `internal/handler/dictionary_translation_handler.go`.
  3. Extracted teacher lesson plan generation, saving, sharing, and deletion into `internal/handler/dictionary_lesson_handler.go`.
  4. Extracted CSV and Anki export streaming into `internal/handler/dictionary_export_handler.go`.
  5. Extracted batch categorization and category lexeme querying into `internal/handler/dictionary_categorization_handler.go`.
  6. Kept `DictionaryHandler` struct definition and core dictionary CRUD/auth methods in `internal/handler/dictionary_handler.go` (466 lines).
- **Consequences**: Strict SRP separation, 100% ABI and route compatibility with `router.Setup` and `main.go`, zero regressions across all 13 test suites.

### ADR-136: VocabularyService Clean Architecture & SRP Refactoring (Spec 61)
- **Status**: Accepted
- **Context**: `vocabulary_service.go` in `substreamedu-dictionary-service-go` was 1212 lines long, combining Anki dual-model generation and CSV streaming, asynchronous image downloading with custom SSRF-safe dialer/transport, streak/SRS statistics calculation, and dictionary CRUD into a single monolithic service.
- **Decision**:
  1. Extracted Anki packaging (`genanki`), TTS/human audio fetching, and CSV streaming into `internal/service/vocabulary_export.go`.
  2. Extracted SSRF validation and safe asynchronous image disk downloader into `internal/service/vocabulary_image_downloader.go`.
  3. Extracted streak calculation, weekly arrays, and SRS stats into `internal/service/vocabulary_stats.go`.
  4. Preserved all method signatures on `*VocabularyService` to ensure 100% ABI compatibility with `DictionaryHandler` and other callers.
  5. Reduced `vocabulary_service.go` to 474 lines of clean CRUD orchestration.
- **Consequences**: Strict separation of concerns, high maintainability and testability in isolation, zero regressions across tests.

### ADR-135: AIService Clean Architecture & SRP Refactoring (Spec 60)
- **Status**: Accepted
- **Context**: `ai_service.go` in `substreamedu-dictionary-service-go` was 3055 lines long, violating SRP by combining low-level HTTP LLM providers (DeepSeek, Groq, Gemini), offline algorithmic exercise/story generators, a 470-line static grammar fallback rules catalog, lesson plan templating, heuristic categorization, and complex prompt engineering in a single monolithic file.
- **Decision**:
  1. Extracted low-level LLM provider clients with circuit-breaker protection into `internal/service/ai_provider_client.go`.
  2. Extracted pure algorithmic exercises and session story generators into `internal/service/ai_exercise_generator.go`.
  3. Extracted grammar rules catalog and resolver into `internal/service/ai_grammar_fallback.go` with characterization tests in `ai_grammar_fallback_test.go`.
  4. Extracted algorithmic lesson plan generator into `internal/service/ai_lesson_generator.go` with unit tests in `ai_lesson_generator_test.go`.
  5. Extracted regex phrase categorizer into `internal/service/ai_categorizer.go`.
  6. Extracted prompt templates and response parsing helpers into `internal/service/ai_prompts.go` with characterization tests in `ai_prompts_test.go`.
  7. Reduced `ai_service.go` to a clean 1216-line coordinator without changing public signatures or breaking callers.
- **Consequences**: High modularity and testability; isolated network I/O from offline heuristic fallbacks; 100% backward compatibility preserved.

### ADR-134: VideoPlayer Humble Object & SRP Architectural Seam (Spec 59)
- **Status**: Accepted
- **Context**: `VideoPlayer.tsx` was the largest and most complex component in the codebase (1523 lines), bundling YouTube & HTML5 video sync, time intervals, subtitle track switching, DOM hover event listeners for tooltips, interactive onboarding state, and multiple large modal dialog states into one component.
- **Decision**:
  1. Extracted subtitle lifecycle, 100ms time synchronization, and track switching into `hooks/useVideoSubtitles.ts` with unit tests.
  2. Extracted dictionary word hover tooltip tracking (`mouseover`, `mouseout`, `mousemove`) into `hooks/useWordTooltip.ts` with unit tests.
  3. Extracted onboarding tour and guest route state into `hooks/useVideoOnboarding.ts` with unit tests.
  4. Extracted reel generator, grammar exploration, lesson studio, and language modal states into `hooks/useVideoModalsState.ts` with unit tests.
  5. Refactored `VideoPlayer.tsx` into a clean, declarative Humble Object coordinator.
- **Consequences**: Strict separation of concerns, high testability in isolation (14 new unit tests added across 4 hooks), zero regression across all 25 VideoPage suites and 66 repository suites.

### ADR-133: Dictionary Page Humble Object & SRP Architectural Seam (Spec 58)
- **Status**: Accepted
- **Context**: `DictionaryPage.tsx` grew into a 1355-line God Component managing resources, categories, all words, debounced search, source classification, modal dialogs, and table pagination all in one component.
- **Decision**:
  1. Extracted server state and mutations into `hooks/useDictionaryData.ts`.
  2. Extracted debounced query, layout, active view mode, and pagination calculations into `hooks/useDictionarySearchPagination.ts`.
  3. Extracted pure string parsing, icon mappings, and regex utilities into `utils/dictionaryUtils.tsx` with dedicated unit tests.
  4. Extracted presentation cards and dialogs into `components/DictionaryResourceCard.tsx`, `components/DictionaryWordCard.tsx`, `components/DictionaryPagination.tsx`, and `components/DictionaryEditModal.tsx`.
  5. Reduced `DictionaryPage.tsx` from 1355 lines to ~445 lines of clean, readable layout.
- **Consequences**: Complete separation of concerns, high maintainability, zero regressions across all dictionary tests and full test suite.

### ADR-132: Flashcards Humble Object & SRP Architectural Seam (Spec 57)
- **Status**: Accepted
- **Context**: `Flashcards.tsx` grew into a 999-line monolithic God Component containing session persistence, optimistic queue mutations, audio gesture listeners, global keyboard shortcut bindings, AI story generation, and tooltip DOM tracking mixed with JSX rendering.
- **Decision**:
  1. Extracted session domain lifecycle and optimistic queue mutations into `hooks/useFlashcardsSession.ts`.
  2. Extracted keyboard shortcuts into `hooks/useFlashcardsKeyboard.ts`.
  3. Extracted story text token highlighting into pure unit-tested utility `utils/storyHighlightUtils.ts`.
  4. Reduced `Flashcards.tsx` to a thin Humble Object presentation component (<450 lines).
- **Consequences**: Pure separation of concerns, high testability, zero regression across all 24 Learning Page tests and 318 overall repository tests.

### ADR-131: Uncle Bob `ub-mode` Integration & Dryer Clean Code Refactoring
- **Status**: Accepted
- **Context**: The `unclebob/ub-mode` repository provides disciplined software engineering guidelines (First Make It Work, Then Make It Right, Follow Practice). In the frontend, string parsing for `<do>...</do>` tags in localized strings (`parseDoTags`) was copy-pasted identically across three major pages (`DashboardPage`, `VideoPage`, and `DictionaryPage`) without unit test coverage.
- **Decision**:
  1. Integrated `ub-mode` into `.agents/skills/ub-mode/SKILL.md` and `.agents/workflows/ub-mode.md`.
  2. Applied TDD: wrote deterministic characterization tests first in `src/utils/textUtils.test.tsx`.
  3. Applied Dryer & Boundary Discipline: extracted pure, single-responsibility `parseDoTags` into `src/utils/textUtils.tsx` supporting custom accent classes.
  4. Refactored callers in `DashboardPage.tsx`, `VideoPage.tsx`, and `DictionaryPage.tsx` to use the shared abstraction, eliminating 30 lines of duplicate code.
- **Consequences**: Zero duplication of tag parsing logic, 100% test coverage for the parsing seam, verified cleanly against `./verify.sh`.

### ADR-130: Production Card Gating by Recognition Mastery (Spec 57)
- **Status**: Accepted
- **Context**: `AddWord` creates recognition and production cards together, so a new word put both into its first session (25 words = 50 cards). Production (recall from meaning) is the hardest type.
- **Decision**: Gate in the selection query, not at creation: `FindNewRecognitionCards` (non-production, capped at `DefaultMaxNewWords`) plus `FindUnlockedNewProductionCards` (sibling recognition not `<> 'review'`, orphans stay eligible) fill the unchanged `ComputeTargetNewCards` budget. Env flag `SRS_GATE_PRODUCTION_CARDS=false` rolls back; query errors fall back to `FindRandomNewWords`. Rejected: creation-time gating (new write path, backfill) and a plain quota cut (slows vocabulary growth).
- **Consequences**: Day one of a new word is recognition only, roughly halving first-day load. No schema change; sibling check is an anti-join on `idx_dictionary_user_id` (add `(user_id, highlighted_text)` index if profiling requires). Needs retention and completion-rate monitoring. Telegram bot selection path is unchanged.

### ADR-129: Client-Side Session Shaping for /learning (Spec 56)
- **Status**: Accepted
- **Context**: Users reported no desire to study. Root cause: every word creates 2 cards (recognition + production), so 25 words become 50 cards in one session (cap 50). The wave counter reset, the start gate added a click, and there was no reward feedback.
- **Decision**: Phase 1 is frontend-only and reversible: monotonic progress (`goodIds / sessionTotal`, persisted as optional `goodIds` in `srs_session_state`), checkpoint at `SESSION_CHECKPOINT = 20` (unrated cards stay due, no FSRS/API change), no start gate, faster transition, skippable story.
- **Consequences**: Perceived effort drops without touching FSRS. Does not fix the workload root cause. Phase 2 (Spec 57) should gate production cards behind recognition mastery in `GetDailyCards` and consider in-session streak. Success metrics (completion rate, time-to-first-rating) are not yet measured.

### ADR-128: Client-Side Graded Readers & EPUB/TXT Interactive Vocabulary Learning (Spec 55)
- **Status**: Accepted
- **Context**: Users required a book-reading learning environment with graded CEFR literature (A1–C1) and custom book uploads, replicating the interactive subtitle vocabulary learning flow (highlight existing dictionary items, word/phrase selection popover, definition/transcription lookup, and direct SRS flashcard saving).
- **Decision**:
  1. Client-Side Persistence: Stored uploaded EPUB and TXT books and per-chapter scroll progress in IndexedDB (`substreamedu_books_db`) with in-memory fallback, removing backend DB migration requirements.
  2. Browser-native Parsing: Implemented `epubParser.ts` using `JSZip` and `DOMParser` to extract container metadata, package manifest, spine order, and XHTML chapter text, and `txtParser.ts` for plain text chapter splitting.
  3. Vocabulary Learning Seam: Integrated `useUserDictionaryItemsLight` for real-time visual highlight of known words and `TranslationPopover` with `useSaveWord` for immediate definition lookup and SRS deck addition.
  4. Design System: Applied Warm Cinematic Espresso aesthetics (`BooksCatalog.module.css`, `BookReader.module.css`) matching `ui_context.md`.
- **Consequences**: Zero backend microservice overhead; instant client-side book loading; seamless SRS integration across subtitles, video, and books.

### ADR-127: AI Harness Modernization & Machine-Enforced SDD (Spec 54)
- **Status**: Accepted
- **Context**: Monolithic `progress_tracker.md` grew to 202 KB, slowing LLM inference and causing context drift; `ai_agent_setup/` held 1940 stale files (39 MB); textual rules were unenforced by scripts.
- **Decision**: 
  1. Archived legacy task logs into `context/archive/progress_tracker_history.md`.
  2. Purged dead `ai_agent_setup/` directory.
  3. Deployed `.harness/` with machine-enforced `check-protected-files.sh`, `check-spec-scope.sh`, and `devin-pre-exec.sh` PreToolUse hook.
  4. Curated `.agents/skills/` to eliminate duplicate/bloated taste skills.
  5. Established unified `verify.sh` and `make verify` as single Definition of Done.
- **Consequences**: Context ingestion reduced by >85%; tooling and spec boundaries are machine-enforced; zero git merge conflicts on monolithic progress files.
