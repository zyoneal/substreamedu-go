# SubStreamEdu: Progress Tracker

## Status Board

- **Current Phase**: Phase 2: Product Feature Expansion & Engineering Excellence
- **In Progress**: None
- **Backlog**: None
- **Recent Completed**:
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
