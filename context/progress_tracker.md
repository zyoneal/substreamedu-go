# SubStreamEdu: Progress Tracker

## Status Board

- **Current Phase**: Phase 2: Product Feature Expansion
- **In Progress**: None
- **Backlog (Phase 2 — Teacher Feedback Features)**:
  - Spec 05F: Writing Practice (P3)
  - Spec 05B: Teacher Mode (P3)
- **Completed (Phase 2)**:
  - Spec 07: Grammar Detection & Exercises (Spec 05D) (ADR-037)
  - Spec 06: Active Vocabulary Practice (Spec 05A) (ADR-036)
  - Spec 05C: Better Contextual Explanations (P1) (ADR-035)
  - Spec 05E: Collocations & Chunks (P1) (ADR-035)
- **Completed (Phase 1)**:
  - Context System & SDD Initialization (`/context/`, `AGENTS.md`)
  - Spec 01: System Audit & Core Stability Refactor (`/context/feature_specs/01_system_audit_refactor.md`)
  - Spec 02: Authentication Hardening & Boundary Security (`/context/feature_specs/02_auth_hardening.md`)
  - Spec 03: Asynchronous Task Offloading & Performance Optimization (`/context/feature_specs/03_async_task_offloading.md`)
  - Spec 04: Frontend Design Token Unification & UI Modernization (`/context/feature_specs/04_frontend_design_token_unification.md`)
  - Spec 05: Teacher Feedback Feature Roadmap (`/context/feature_specs/05_teacher_feedback_features.md`)
  - Purge Legacy Reverso Integration & Dead Types (ADR-013)
  - Purge Dead, Unreferenced, and Obsolete Code across Frontend & Go Services (ADR-019)
  - Dynamic Diagonal Resize & Zero-Scroll Screen-Fit Player (ADR-027)
  - Subtitle ASS/SSA Formatting & Tags Sanitization (ADR-029)
  - Purge Custom Trailing Cursor & Restore Native OS Pointer Precision (ADR-030)
  - FAANG-Grade User Timezone Awareness & SRS Streak Week Calculation (ADR-031)
  - Sleek Bottom Floating Onboarding Toast Redesign (ADR-032)
  - Purge Yellow Outline on Active Streak Checkmark Circles (ADR-033)
  - FAANG-Grade User Timezone Awareness in SRS Daily Cards (ADR-034)

---

## Architectural Decisions Log (ADL)

| ADR ID | Date | Decision | Rationale | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | 2026-09-11 | Adopt Spec-Driven Development (SDD) via `/context/` System | Prevent AI context drift and unintended cross-boundary code modifications. | All AI agents must follow `/context/ai_workflow_rules.md` and read `AGENTS.md`. |
| **ADR-002** | 2026-09-11 | Standardize on `golang-migrate` across all Go Services | Unify database migration approach; replace ad-hoc `ALTER TABLE` in `InitSchema()` and unversioned SQL loops. | Predictable, reversible schema state with `schema_migrations` tracking tables in all DBs. |
| **ADR-003** | 2026-09-11 | Strict JWT Authorization on Mutations | Eliminate IDOR vulnerabilities (`/api/users/:userId`) and unauthenticated subtitle/dictionary mutations (`?userId=...`). | Token verification required on all mutation endpoints; `userId` extracted strictly from validated claims. |
| **ADR-004** | 2026-09-11 | Ingress Gateway Isolation of Inter-Service Routes | Block public internet access to `/api/auth/internal/*` routes. | Internal endpoints require private container networking or pre-shared internal HMAC authentication. |
| **ADR-005** | 2026-09-11 | Asynchronous Offloading of Heavy Tasks | Offload synchronous LLM text generation, Anki APKG exports, and batch embeddings away from HTTP request handlers. | Prevent HTTP 504 timeouts; ensure server remains responsive under concurrent load. |
| **ADR-006** | 2026-09-11 | Design System Unification (Warm Cinematic Espresso) | Purge legacy conflicting Tailwind tokens (`primary-blue: #000`, `night`, etc.) and enforce `src/index.css` CSS variables. | UI visual consistency across all pages; zero hardcoded raw hex colors; zero UI emojis. |
| **ADR-007** | 2026-09-12 | Standardize Static Go Healthcheck Probes Across All Containers | BusyBox `wget` in Alpine lacks GNU flags (`--no-verbose`, `--tries`), causing container probes to fail. Standardize all 5 Go services on compiled `/app/healthcheck` static binaries. | Zero external binary dependencies for health checks; reliable zero-downtime CD health gating; fast failure diagnosis in `deploy.sh`. |
| **ADR-008** | 2026-09-12 | Isolate Migration State on Shared Databases via `x-migrations-table` | `notification-service` and `iam-service` both connect to `sse_iam`. Default `schema_migrations` table caused version collision (version 4 in IAM vs version 2 in Notification). | `notification-service` tracks migration state in `schema_migrations_notification`, eliminating version collision and startup crashes. |
| **ADR-009** | 2026-09-12 | Concurrency Guarding & Interceptor Idempotency in Review Flow | Prevent client-side request bursts and duplicate Axios interceptors causing DB row lock queuing and console noise. | Cards marked in-flight via ref & UI disabled; Axios interceptors ejected before re-registration. |
| **ADR-010** | 2026-09-12 | Database Indexing on `review_log` & Redis Caching for SRS Dashboard Stats | Eliminate 3.6s latency on `GET /api/dictionary/srs/stats` caused by unindexed table scans on `review_log` and complex dictionary aggregations. | Added migration `000003_review_log_and_stats_indexes` (user_id, reviewed_at DESC); added transparent Redis cache (`srs:stats:{userID}`) with 2m TTL and mutation invalidation. |
| **ADR-011** | 2026-09-12 | Fix Login Dismissal Infinite 401 Loop & Google OAuth CSP | Replace history pop navigate(-1) on login modal dismissal with replace to root (/); lift GoogleOAuthProvider to root; purge expired jwt in clearUser; permit accounts.google.com in style-src. | Eliminates 401 redirect bounce loops between protected pages and login modal; ensures clean guest dismissal without CSP or multi-initialization errors. |
| **ADR-012** | 2026-09-12 | Optimistic SRS Review Transitions & Resilient TTS Circuit Breaker | Eliminate 7.6s UI freezing on flashcard rating by performing instant optimistic state updates and background reviewCard2Button calls. Add 1.2s timeout, 5-minute circuit breaker cooldown, and silent fallback to SpeechSynthesis in `useTTS.ts` to prevent external dictionary 522 CORS stalls. | Instantaneous flashcard review UX regardless of network/DB latency; zero browser socket stalls or console error spam when `api.dictionaryapi.dev` suffers outages. |
| **ADR-013** | 2026-09-12 | Purge Legacy Reverso Scraper & Dead Client Types | All translation flows now rely on dedicated LLM/context translation endpoints (`/translation/prod`, `/process-text`). Remove deprecated `GET /reverso` and dead frontend types/styles. | Eliminates fragile synchronous web scraping, unblocks IP bans, and cleans up client bundle and types. |
| **ADR-014** | 2026-09-12 | Integrate Advanced Design Engineering & Motion Skills Suite | Ingest 7 design skill systems into `.agents/skills/` and `.agents/workflows/` (Emil Kowalski, ConardLi Garden Skills, eleyadesign, MengTo, Jakub Krehel, Tastemaker, and Owl-Listener). | Equips AI agents and developers with senior visual design, spring animation physics, Gestalt cognitive laws, and anti-slop design workflows. |
| **ADR-015** | 2026-09-12 | Dual-Tier Cinematic Cursor & Spring Micro-Interactions | Elevate desktop homepage to SOTD/Awwwards level without layout distortion. Implement 0ms micro-reticle dot with spring-damped (`damping: 26, stiffness: 320`) fluid follower ring that expands on interactive controls and morphs into contextual badges (`stream`, `reveal`, `drag`, `action`). | Zero perceived pointer latency; authentic tactile feedback; deactivates cleanly on touchscreens (`@media (hover: none)`). |
| **ADR-016** | 2026-09-12 | Cinematic Ambient Lighting & 35mm Vignette System | Enhance visual depth with overhead tungsten projector beam (`projectorHum` breathing), perimeter 35mm lens optical falloff (`filmVignette`), subtle analog film grain (`filmGrain`), and reactive GPU spotlight tracking (`interactiveSpotlight`). | Transforms flat digital OLED black into an authentic midnight cinema atmosphere; 100% pointer-events: none; zero layout overhead. |
| **ADR-017** | 2026-09-12 | Cinematic Scroll Flow & Multi-Plane Parallax Choreography | Implement Awwwards-grade scroll narrative: multi-plane camera parallax between hero foreground copy and 3D text stream (`useTransform`), glowing golden progress micro-bar (`useSpring`), and tight sequential section staggers across Bento, Pricing, and FAQ. | Seamless cinematic scene transitions without jarring jumps; 100% GPU-accelerated; zero layout reflow. |
| **ADR-018** | 2026-09-12 | Component-Aware Path Filtering & Toolchain Alignment in CI | Prevent GitHub Actions free quota exhaustion (2,000 mins) caused by running 14 parallel jobs on every single commit. Add `dorny/paths-filter@v3` to execute only modified components, align `GO_VERSION` to `1.26`, upgrade Node.js to `20`, and disable invalid root cache. | Conserves ~85% runner minutes per commit; eliminates cross-service build thrashing; fixes Go 1.26 toolchain mismatch and setup-go cache errors. |
| **ADR-019** | 2026-09-12 | Purge Dead, Unreferenced, and Obsolete Code across Frontend & Go Services | Eliminate 36 orphan/unreferenced files and obsolete methods across React client and 5 Go microservices. Purge unused imports/variables and configure ESLint ignore patterns. | Reduced bundle footprint; zero dead routes or duplicate components; 100% unit test passing rate across Jest and Go test suites. |
| **ADR-020** | 2026-09-12 | Auto-Cancel Redundant CI & CD Workflows on Successive Commits | Enable `cancel-in-progress: true` in `cd.yml` with group `cd-deployment-${{ github.ref }}` and standardize `ci.yml` concurrency group to `ci-${{ github.ref }}`. | Prevents stale deployments and builds from queuing or running on older commits; saves GitHub Actions minutes and ensures only the latest commit builds and deploys. |
| **ADR-021** | 2026-09-12 | Purge Obsolete Python AI Embedding Artifacts & pgvector Dependencies | Remove dead `SemanticWebPage.tsx`, `react-force-graph-2d` dependency, semantic-neighbors routes, `pgvector-go` Go module, and switch to standard `postgres:15`. | Eliminates dead client bundle weight, cleans up unused endpoints, removes unneeded HNSW indexing and pgx connection hooks. |
| **ADR-022** | 2026-09-12 | Self-Healing Deployment Mutex & Eliminate Parent-Child Lock Deadlock | Remove duplicate `flock` in `cd.yml` (which caused parent-child lock conflicts with `deploy.sh`) and add active process detection/auto-pruning (`fuser`/`kill -15`) in `deploy.sh`. | Eliminates 300s lock timeout errors, auto-cleans stale/orphaned deployment processes, and ensures smooth zero-downtime rolling deploys. |
| **ADR-023** | 2026-09-12 | Maintain pgvector Database Compatibility & Drop Stale Index via Migration | Restore `pgvector/pgvector:pg15` image in `docker-compose.yml` to satisfy PostgreSQL `$libdir/vector` dependency on existing volume, and add migration 000004 to cleanly drop `idx_dictionary_embedding` and column `embedding`. | Fixes SQLSTATE 58P01 ($libdir/vector missing) on `GET /api/dictionary/srs/stats`, restores instant sub-5ms stats query latency, and safely purges vector artifacts from database. |
| **ADR-024** | 2026-09-12 | Restore Lightweight Dictionary Items Route in Dictionary Service | Re-register `GET /resources/items/light` route before wildcard `/resources/:name/items` in `substreamedu-dictionary-service-go`. | Fixes HTTP 404 on `GET /api/dictionary/resources/items/light?limit=10000` requested by frontend `DictionaryService.ts:fetchDictionaryItemsLight`. |
| **ADR-025** | 2026-09-12 | Zero-CORS YouTube Reel Generator & HD Clip Streaming Endpoint | Stop passing raw YouTube HTML URLs into `<video src="..." crossOrigin="anonymous">`; preload high-res YouTube poster with anonymous CORS for instant zero-latency canvas preview; add `/api/youtube/clip/:videoId` endpoint in `media-service` with `yt-dlp` section cutting and disk caching. | Eliminates YouTube CORS blocking errors and indefinite "Loading video stream..." hangs; allows real-time preview and export of vertical 9:16 vocabulary reels for both YouTube videos and local video files. |
| **ADR-026** | 2026-09-12 | Refine Video Player Seek Step to 4s | Adjust player keyboard shortcuts (`ArrowLeft` / `ArrowRight`) and UI seek buttons (`RotateCcw` / `RotateCw`) to 4 seconds. | Provides comfortable, phrase-level navigation when listening to dialogues and subtitles in language learning flow without jumping too far. |
| **ADR-027** | 2026-09-12 | Auto-Fit Zero-Scroll Player Sizing & Dynamic Per-Video Aspect Ratio | Eliminate manual resize slider clutter; set player to dynamic max-fit no scroll by default; dynamically detect video natural aspect ratio (`videoWidth / videoHeight`) on metadata load and calculate exact max viewport bounds (`window.innerHeight - 152px overhead`). | Zero vertical or horizontal scrolling for any video geometry (16:9, 21:9, 4:3, vertical); seamless automatic scaling; Theater mode button / shortcut `T` available for compact toggle. |
| **ADR-028** | 2026-09-12 | Transparent Feature Grid & Card Bento with Inner Divider Borders | Remove solid background colors from `.featureGrid` and `.featureCard` to blend seamlessly with dark canvas ambient lighting, while preserving 1px inner grid dividers between cells across responsive breakpoints. | Eliminates blocky opaque rectangular backgrounds; ensures seamless visual depth and ambient glow behind capability cards with crisp interior divider lines. |
| **ADR-029** | 2026-09-13 | Sanitize ASS/SSA Override Tags, HTML Markup, and `\N` Escapes Across Subtitle Pipelines | Subtitles extracted from MKV files (SSA/ASS tracks) or downloaded from subtitle providers contained raw ASS override tags (`{\i1}`, `{\i0}`), escaped hard line breaks (`\N`), hard spaces (`\h`), and HTML tags. This glued adjacent words together (`be\Nif`), leaked raw markup into rendered subtitles, and corrupted sentence context for AI translation and flashcard generation. | Created centralized `subtitleCleaner.ts` utility (`cleanSubtitleText`, `cleanSubtitleSelection`); sanitized subtitle parsing in `srtParser.ts` and extraction in `mkvSubtitleExtractor.ts`; updated `VideoPlayer.tsx` display and selection pipeline to strip ASS/HTML tags and cleanly separate dialogue lines (`- `, `— `); updated Go backend parser `CleanSubtitleText`. 100% unit tests pass across TypeScript and Go. |
| **ADR-030** | 2026-09-14 | Purge Custom Trailing Cursor & Restore Native OS Pointer Precision | The custom spring-animated trailing cursor (`CinematicCursor`) created a psychological perception of mouse smoothing / altered sensitivity, visual latency, and friction during precision tasks (word-by-word subtitle selection, flashcard review). | Removed global `<CinematicCursor />` from `App.tsx` and purged dead component files (`CinematicCursor.tsx`, `CinematicCursor.module.css`). Restores pure 1:1 native OS pointer physics, direct manipulation, and zero perceived latency across all routes. |
| **ADR-031** | 2026-09-14 | FAANG-Grade User Timezone Awareness & SRS Streak Week Calculation | Client in UTC+3 (e.g. Monday 00:41) was evaluated against server UTC (Sunday 21:41), marking reviewedToday: true for Sunday's reviews and causing client heuristic to place a false checkmark on Monday. Client-side heuristic calculation also broke at weekly calendar boundaries. | Standardized on user timezone awareness: frontend sends `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` via Axios; backend embeds tzdata (`_ "time/tzdata"`), groups PostgreSQL review dates via `((reviewed_at AT TIME ZONE 'UTC') AT TIME ZONE $tz)::date`, computes `dueCutoff` and `isToday` in user location, and emits explicit `weekDays: [bool; 7]` for the user's current week. |
| **ADR-032** | 2026-09-14 | Sleek Bottom Floating Onboarding Toast Redesign | Fixed top-positioned onboarding guide bar (top: 56px) on mobile directly occluded the video stream and subtitles, squished titles into 4 broken vertical words (STEP 1 OF / 2: CLICK / TO / TRANSLATE), and left the close button stranded in the bottom-left. | Repositioned onboarding guide to a non-intrusive bottom floating toast (bottom: 24px desktop, bottom: 84px mobile above Telegram FAB); replaced heavy 2-step indicator circles with a sleek `1/2` badge; anchored close button to top-right; eliminated radioactive yellow glow for refined warm dark glassmorphism. |
| **ADR-033** | 2026-09-15 | Purge Yellow Outline on Active Streak Checkmark Circles | `.weekNodeToday` was unconditionally applied to current day even after completion, causing an unsightly neon yellow outline around the active checkmark circle. | Added `!isActive` guard in `DashboardPage.tsx` and override `.weekNodeActive.weekNodeToday` in `DashboardPage.module.css`. |
| **ADR-034** | 2026-09-16 | FAANG-Grade User Timezone Awareness in SRS Daily Cards (`/srs/today`) | When local user time was past midnight (e.g. 00:06 UTC+3, Sept 16), the dashboard correctly identified 50 cards due for today via timezone-aware `GetDictionaryStats`. However, `/api/dictionary/srs/today` hardcoded UTC time (21:06 UTC, Sept 15), filtering out cards due on Sept 16 and falling back to 50 brand new cards (`status: 'new'`). Furthermore, review cache invalidation did not purge timezone-suffixed keys (`srs:stats:<userID>:<loc>`). | Added `loc *time.Location` parameter to `GetDailyCards` and resolved user location in `DictionaryHandler.GetDailyCards(c)`. Updated `learning_service` Redis cache invalidation to scan and delete all `srs:stats:<userID>*` keys upon review. 100% Go unit tests pass. |
| **ADR-035** | 2026-09-18 | Rich Contextual Explanations, Register Badges, and Collocation Chunks in Popover (Spec 05C & 05E) | Add register, usage note, alternatives with register notes, typical contexts, and clickable multi-word chunks to LLM translation prompt (v3.0 cache key) and frontend popover UI. | Learners immediately understand nuance, formality level, and naturally occurring multi-word phrases; can click chunks to translate and save them directly as single vocabulary items. Zero DB schema changes needed. |
| **ADR-036** | 2026-09-18 | Active Vocabulary Practice: Cloze Gap-Fills, Paraphrase, & AI Sentence Builder (Spec 06 / 05A) | Provide interactive production exercises on /learning with instant client-side cloze from subtitle context, AI exercise generation, and real-time AI sentence evaluation. | Bridges passive flashcard recognition into active production in authentic video contexts. Zero DB schema changes. |
| **ADR-037** | 2026-09-18 | Authentic Grammar Detection, Subtitle Spotlight, & Video Grammar Index (Spec 07 / 05D) | Learners acquire vocabulary from subtitles, but natural speech contains rich B1–C1 grammar structures (Conditionals, Inversion, Modal Perfects, Causatives) that go unassisted. Processing 1500 subtitle lines via LLM is cost-prohibitive and introduces video stutter. | Implemented 3-tier hybrid architecture: (1) Client-side rule engine (`grammarDetector.ts`) scanning 12+ English structures in <5ms; (2) Discreet subtitle spotlight badge `[✨ Grammar: 3rd Cond]`, `GrammarSpotlightModal` with formula, quote highlight, explanation, and 1-question mini-quiz; (3) `VideoGrammarIndexModal` with CEFR filters and seek links; (4) Backend on-demand endpoint `POST /api/dictionary/grammar/analyze` with circuit breaker and algorithmic fallback. Zero DB migrations, 100% tests pass. |

---

## Session Notes
- **Grammar Detection & Exercises (Completed 2026-09-18)**:
  - Added `AnalyzeGrammarRequest` and `AnalyzeGrammarResponse` in `dto.go`.
  - Implemented `AnalyzeGrammar` in `ai_service.go` with DeepSeek/Groq/Gemini fallback and offline linguistic rules.
  - Added `AnalyzeGrammar` handler with 15s deadline in `dictionary_handler.go` and wired route `api.POST("/grammar/analyze", dh.AnalyzeGrammar)`.
  - Created `src/utils/grammarDetector.ts` client-side rule engine supporting 12+ English structures (Conditionals 1st–3rd, Inverted Conditionals, Modal Perfects, Causatives, Passive Voice, Inversion, Wish, Used to, Participles) and full subtitle track scanning.
  - Created `src/components/VideoPage/components/GrammarSpotlightModal.tsx` & `.module.css` with formula card, quote breakdown, and 1-question interactive mini-quiz with immediate feedback.
  - Created `src/components/VideoPage/components/VideoGrammarIndexModal.tsx` & `.module.css` with CEFR filtering and video seek links.
  - Integrated grammar spotlight badge into active subtitle container (both normal and fullscreen) and added "Grammar in this Video" button into player controls bar in `VideoPlayer.tsx`.
  - Added unit test suite `src/utils/grammarDetector.test.ts` (10 tests, 100% pass).
  - Resolved subtitle timestamp parsing bug (`startTimeMs` vs `start`), updated `VideoPlayer.tsx` to pass clicked cue sentence `selectedGrammarSentence` directly to `GrammarSpotlightModal` instead of out-of-sync playback `currentSubtitle`, and differentiated `be_used_to` ("Be / Get used to (Accustomed)" B2) from `used_to` ("Used to (Past Habit)" B1).
  - Verified: Go tests pass (`go test -v ./...`), Go build succeeds, TypeScript typecheck passes (`npx tsc --noEmit`), Jest test suite passes (18 suites, 75 tests), and production bundle builds cleanly (`npm run build`).
- **Active Vocabulary Practice Engine (Completed 2026-09-18)**:
  - Implemented `GeneratePracticeExercises` and `EvaluateSentence` in `ai_service.go` with resilient algorithmic cloze fallbacks.
  - Added request/response DTOs (`PracticeExercisesRequest`, `EvaluateSentenceRequest`) and registered `/api/dictionary/practice/*` routes.
  - Implemented `ActivePractice.tsx` and `ActivePractice.module.css` following Cinematic Espresso design system.
  - Added dual modes: Contextual Cloze (typing + options, audio TTS, hint reveals) and AI Sentence Builder (free text writing with instant grammar, naturalness, and native polish critique).
  - Enhanced `Flashcards.tsx` to offer a direct CTA on session completion to practice reviewed session words actively.
  - Upgraded `LearningPage.tsx` with top mode switcher tabs between SRS Flashcards and Active Practice.
  - Verified: Go tests pass (`go test -v ./...`), Go build succeeds, TypeScript typechecks clean (`npx tsc --noEmit`), Jest test suite passes (17 suites, 65 tests), and production bundle builds cleanly (`npm run build`).
- **Rich Contextual Explanations, Register Badges & Collocation Chunks (Completed 2026-09-18)**:
  - Extended LLM translation prompt in `ai_service.go` (`createTranslationPrompt`) with output schema for `register` (formal, informal, slang, neutral, academic, literary), `usage_note`, `alternatives`, `chunks` (multi-word units), and `typical_contexts`.
  - Bumped translation cache key to `ai:translation:v3.0:` and optimal `maxTokens` to handle richer linguistic payload.
  - Extended Go DTO `TranslationProdResponse` and mapped legacy/compatibility fields cleanly.
  - Extended frontend `SubtitleService.ts` and `types.ts` (`TranslationData`, `INITIAL_TRANSLATION_DATA`).
  - Mapped API response into `TranslationData` in `VideoPlayer.tsx` across all translation lifecycle events (initial, reset, selection).
  - Enhanced popover UI in `VideoPlayer.tsx` with:
    - Register badge pill adjacent to partOfSpeech with color-coded theme variants (`formal`, `informal`, `slang`, `academic`, `literary`, `neutral`).
    - Contextual usage note explaining *why* this phrase is used in the subtitle context.
    - Clickable multi-word chunks chips — clicking re-translates the full chunk and prepares it for 1-click saving as a vocabulary unit.
    - Alternatives list with inline register pills and usage differences.
    - Typical contexts tags indicating domains/situations where the term is used.
  - Styled all new popover sections in `VideoPlayerPopover.module.css` following Cinematic Espresso design system tokens.
  - Verified: Go tests pass (`go test -v ./...`), Go service builds (`go build ./cmd/...`), TypeScript typechecks clean (`npx tsc --noEmit`), Jest test suite passes (16 suites, 61 tests), and production bundle builds cleanly (`npm run build`).
- **FAANG-Grade User Timezone Awareness in SRS Daily Cards (Completed 2026-09-16)**:
  - Propagated user timezone from HTTP request (`X-Timezone` header / `?tz=...` query) to `learningService.GetDailyCards(ctx, userID, loc)`.
  - Aligned `todayStart` and `dueCutoff` in `GetDailyCards` to user local calendar day, preventing premature fallback to random new cards when reviewing past midnight in local time.
  - Updated Redis invalidation across `ReviewCard` and `RefreshSession` to match `srs:stats:<userID>*`, ensuring stats cache updates across all timezones.
  - Added unit tests in `srs_daily_cards_timezone_test.go` verifying boundary behavior across timezones.
- **Purge Yellow Outline on Active Streak Checkmark Circles (Completed 2026-09-15)**:
  - Guarded `styles.weekNodeToday` class application with `isToday && !isActive` in `DashboardPage.tsx`.
  - Added CSS rule `.weekNodeActive.weekNodeToday { border-color: #ede8e0; box-shadow: none; }` in `DashboardPage.module.css`.
  - Confirmed active streak checkmark circles render clean parchment `#ede8e0` border and background with zero yellow border or box-shadow ring.
  - Verified with `npx tsc --noEmit`, Jest suite (16 suites, 61 tests passed), and `npm run build`.
- **FAANG-Grade User Timezone Awareness & SRS Streak Week Calculation (Completed 2026-09-14)**:
  - Fixed timezone discrepancy between UTC backend and local client timezone.
  - Client sends `X-Timezone` via `AxiosService.ts` default headers and request interceptor.
  - Backend extracts `X-Timezone` (or `?tz=...`), embeds `time/tzdata`, and evaluates `today`, `yesterday`, and `dueCutoff` in user's timezone.
  - In PostgreSQL `GetUserReviewDates`, dates are converted to user's timezone: `CAST(((reviewed_at AT TIME ZONE 'UTC') AT TIME ZONE $2) AS DATE)`.
  - Backend returns explicit `weekDays: [bool; 7]` for Monday through Sunday of user's current week.
  - Frontend `DashboardPage.tsx` and `StreakShareModal.tsx` consume `weekDays` directly, eliminating client-side heuristic guesswork.
  - Verified with Go unit tests (`go test -v ./internal/service -run TestStreakTimezone`) and TypeScript Jest suite (16 suites, 61 tests passed).
- **Sleek Bottom Floating Onboarding Toast Redesign (Completed 2026-09-14)**:
  - Repositioned `onboardingGuideWrapper` from obstructive fixed top banner (`top: 56px`) to sleek bottom floating toast (`bottom: 84px` on mobile above Telegram FAB, `bottom: 24px` on desktop).
  - Redesigned `OnboardingGuideBar.tsx` and `.module.css`: replaced space-hogging dual circles with a clean `1 / 2` badge and single-line title.
  - Moved `closeButton` to the standard top-right corner.
  - Replaced radioactive yellow border with subtle dark glassmorphic card styling (`rgba(18, 17, 15, 0.94)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.12)`).
  - Verified 100% test pass rate across Jest test suite (16 suites, 61 tests).

---

## Session Notes
- **Restore Native OS Pointer Precision & Ambient Cleanliness (Completed 2026-09-14)**:
  - Removed `<CinematicCursor />` and its import from `src/App.tsx`.
  - Deleted `src/components/HomePage/CinematicCursor.tsx` and `CinematicCursor.module.css`.
  - Removed global `cursor: none !important;` override from `src/index.css`, immediately restoring native OS cursor visibility on all elements.
  - Removed mouse-following flashlight/torchlight (`interactiveSpotlight`) and its `mousemove` listener from `HomePage.tsx` and `HomePage.module.css`.
  - Verified 100% test pass rate across Jest test suites and zero TypeScript errors (`tsc --noEmit`).
- **Subtitle ASS/SSA Formatting & Tags Sanitization (Completed 2026-09-13)**:
  - Created centralized utility `subtitleCleaner.ts` with `cleanSubtitleText` and `cleanSubtitleSelection`: strips ASS/SSA override tags (`{\i1}`, `{\pos()}`, `{\c&H...&}`, etc.), converts ASS hard/soft breaks (`\N`, `\n`) into real newlines (`\n`), converts ASS hard spaces (`\h`) into regular spaces, decodes HTML entities, and normalizes duplicate whitespace.
  - Integrated `cleanSubtitleText` in `mkvSubtitleExtractor.ts` so embedded MKV subtitle tracks are emitted as valid, clean SRT blocks without raw SSA tags.
  - Integrated `cleanSubtitleText` into `srtParser.ts` so any uploaded or fetched `.srt` file is sanitized at parse time.
  - Refactored `formatSubtitleForDisplay` in `VideoPlayer.tsx` to sanitize tags before collapsing non-dialogue newlines into spaces and preserving dialogue lines (`- `, `— `) on distinct lines.
  - Updated `cleanTextForSelection` and `getExtendedSubtitleContext` in `VideoPlayer.tsx` to ensure word click-to-translate matching and dictionary sentence saves receive pristine context without markup.
  - Enhanced Go backend `CleanSubtitleText` in `substreamedu-media-service-go/internal/parser/subtitle_parser.go` with regex patterns for ASS override tags and `\N`/`\h` escapes.
  - Added unit test suites `subtitleCleaner.test.ts`, `srtParser.test.ts`, and `subtitle_parser_test.go` verifying all user-reported cases (`be\Nif`, `{\i1}I'm Teagan Tao.{\i0}`, dialogue dashes, and punctuation).
  - Verified 100% test pass rate on frontend Jest (16 suites, 60 tests), TypeScript compile (`tsc --noEmit`), production build (`npm run build`), and Go tests (`go test ./...` in `media-service`).
- **Transparent Feature Grid & Card Bento with Inner Divider Borders (Completed 2026-09-12)**:
  - Removed solid `background: var(--gray-200)` from `.featureGrid` and `background: var(--black)` / `:hover` solid background from `.featureCard`.
  - Converted divider system to pure interior card borders (`border-right: 1px solid var(--gray-200)` and `border-bottom: 1px solid var(--gray-200)`) with edge-suppression (`:nth-child(3n) { border-right: none }`, `:nth-child(n+4) { border-bottom: none }`).
  - Added responsive column adjustments for tablet (2 columns) and mobile (1 column) preserving clean interior dividers without external bounding borders.
- **Auto-Fit Zero-Scroll Video Player & Per-Video Dynamic Aspect Ratio (Completed 2026-09-12)**:
  - Removed manual corner resize drag grip (`resizeGrip`) and popup pill indicator to keep the player UI clean and uncluttered.
  - Set default state to `isMaxFit: true`, so every video automatically opens at the maximum possible size fitting the user's screen without scrolling.
  - Implemented dynamic per-video aspect ratio detection via `onLoadedMetadata` and `onCanPlay`: measures exact `videoWidth / videoHeight` for HTML5 videos (and 16:9 for YouTube embeds), instantly calculating `maxFitWidth = min(floor(availableHeight * ratio), window.innerWidth - 48px)`.
  - Added responsive `resize` event handler that continuously adapts player dimensions to window resizing while preserving zero-scroll bounds.
  - Retained Theater mode toggle button (`RectangleHorizontal` / `Shrink`) in control bar and keyboard shortcut `T` to toggle between max-fit and compact 1050px mode.
  - Verified with `npx tsc --noEmit` (0 errors) and 13 Jest test suites (45 tests passed). Changes kept local without pushing per user request.
- **Purge Dead, Unreferenced, and Obsolete Code across Frontend & Go Services (Completed 2026-09-12)**:
  - Performed static dependency analysis identifying 34 unreferenced frontend source files (obsolete pages `PaymentPage.tsx`, `DemoPage.tsx`, primitive `Modal.tsx`, unimported `Footer.tsx`, unused UI experiments, and dead `VideoPage` / `DictionaryItemsPage` subcomponents and hooks). Deleted all 34 files with `git rm`.
  - Purged dead in-memory CSV export functions (`ExportDictionaryAsCsv`, `ExportResourceAsCsv`, `generateCsv`), uncalled pagination relics (`GetAllLexemes`, `GetAllLexemesLight`, `GetLexemesByResource`), and dead cache helpers in `substreamedu-dictionary-service-go`.
  - Removed uncalled standalone function `ParseURLVideoID` and unused `net/url` import in `substreamedu-media-service-go`.
  - Removed unrouted `jwks_handler.go` from `substreamedu-iam-service-go`.
  - Removed dead `net/http` middleware `inter_service_auth.go` from `substreamedu-notification-service-go`.
  - Cleaned all unused variables, parameters, and catch blocks across 14 frontend files; added `argsIgnorePattern: "^_"` to ESLint.
  - Verified 100% test pass rate on frontend Jest (13 suites, 45 tests), TypeScript compilation (`tsc --noEmit`), production build (`npm run build`), and Go backend (`make test` across all 5 microservices).
- **Integrate Advanced Design Engineering & Motion Skills Suite (Completed 2026-09-12)**:
  - Ingested Emil Kowalski design engineering suite: `animate`, `emil-design-eng`, `animation-vocabulary`, `improve-animations`, `review-animations`.
  - Ingested ConardLi Garden Skills: `web-design-engineer` with all references (`critique-guide.md`, `failure-patterns.md`, `style-recipes/`, `design-directions.md`).
  - Ingested eleyadesign: `landing-page-design`.
  - Ingested MengTo: `build-awwwards-quality-sites` and `video-to-super-prompt`.
  - Ingested Jakub Krehel: `better-ui`, `better-layout`, `better-typography`, `better-colors`, `better-accessibility`, `better-interface`, `better-writing`, `interface-review`, `explain-interface`, `break`, `variant`.
  - Ingested codeswithroh: `tastemaker` (complete with references, scripts, ideagram, assets).
  - Ingested Owl-Listener: `visual-critique` (7 dimensions) and `perception-laws` (cognitive UX & Gestalt laws).
  - Created 14 interactive slash commands in `.agents/workflows/`: `/emil-design-eng`, `/animate`, `/web-design-engineer`, `/critique-guide`, `/failure-patterns`, `/style-recipe`, `/landing-page-design`, `/video-to-super-prompt`, `/build-awwwards-quality-sites`, `/better-layout`, `/interface-review`, `/tastemaker`, `/visual-critique`, `/perception-laws`.
- **Purge Legacy Reverso Scraper & Dead Client Types (Completed 2026-09-12)**:
  - Purged synchronous web scraping route `GET /api/dictionary/reverso` and method `GetReversoTranslation` from `substreamedu-dictionary-service-go`.
  - Removed dead types `ReversoEntry`, `ReversoResponse`, and unused callback signatures (`onFetchReverso`, `fetchReversoTranslation`, `REVERSO_LANGUAGE_MAP`) from `substreamedu-frontend`.
  - Removed unused `.reversoDefinition` CSS rules across `VideoPlayerPopover`, `SongSearchPlayer`, and `TextPasteHighlighter`.
  - Standardized `lucide-react` import in `LanguageSelector.tsx` to fix Jest ESM parse failure.
  - Verified with `go test ./...` in `dictionary-service` (all pass) and frontend `npm test` (all 13 test suites / 45 tests pass) and `npm run build` (success).
- **Flashcard Optimistic Transitions & TTS Circuit Breaker (Completed 2026-09-12)**:
  - Root cause of UI freezing and 7.6s delays: `Flashcards.tsx` awaited `DictionaryService.reviewCard2Button` before transitioning to the next card; simultaneously, `useTTS.ts` had no timeout when querying `api.dictionaryapi.dev`, which is currently failing with Cloudflare 522 timeouts (dropping CORS headers and throwing `Failed to fetch`).
  - Refactored `Flashcards.tsx` `handleRating` to immediately apply optimistic state updates (`setReviewWords`, `setCurrentIndex`, `setAnsweredIds`, `setRevealLevel(0)`) and offload `reviewCard2Button` to the background.
  - Replaced blocking `isSubmitting` state with card-level `inFlightCardIds` tracking to ensure next cards are never blocked by previous saves.
  - Hardened `useTTS.ts` with a 1.2s `AbortController` timeout, an automatic 5-minute circuit-breaker cooldown on repeated failures, and instant silent fallback to `window.speechSynthesis`.
  - Added unit tests in `src/hooks/useTTS.test.ts`; verified all tests pass (`Flashcards.test.tsx`, `useTTS.test.ts`) and `npm run build` succeeds.
- **Login Dismissal 401 Loop & Google OAuth CSP Resolution (Completed 2026-09-12)**:
  - Root cause of bug when clicking 'X' on login: modal's `handleClose` invoked `navigate(-1)`, returning to the protected page (e.g. `/learning` or `/dashboard`) that triggered the 401 in the first place, immediately re-triggering 401 and redirecting back to `/login` in an infinite loop.
  - Replaced `navigate(-1)` in `LoginPage.tsx` with `navigate("/", { replace: true })` and added ESC key dismissal.
  - Fixed `AuthService.clearUser()` to properly delete `jwt` from `localStorage` on 401.
  - Lifted `GoogleOAuthProvider` to `App.tsx` root to prevent multiple initializations of Google Identity Services on modal toggling.
  - Added `https://accounts.google.com` to `style-src` in `Caddyfile` CSP to eliminate stylesheet blocking on `https://accounts.google.com/gsi/style`.

- **SRS Dashboard Stats Latency Optimization (Completed 2026-09-12)**:
  - Root cause of 3593ms response time: `review_log` had no indexes, forcing sequential full table scan on every streak calculation; plus repeated multi-filter aggregates on `dictionary` without caching.
  - Added migration `000003_review_log_and_stats_indexes` with composite indexes on `review_log(user_id, reviewed_at DESC)`, `review_log(user_id, card_id)`, and `dictionary(user_id, card_type, status)`.
  - Added Redis caching (`srs:stats:{userID}`, 2-minute TTL) in `VocabularyService.GetDictionaryStats`.
  - Added cache invalidation hooks in `ReviewCard`, `AddWord`, `DeleteWord`, `DeleteResource`, `RefreshSession`, and `ResetAllSRSProgress`.
  - Verified with unit tests (`srs_stats_cache_test.go`).

- **JWT Expiration Extension to 30 Days (Completed 2026-09-12)**:
  - Root cause of session drops/logouts while highlighting words after inactivity: `JWT_EXPIRATION_MS` defaulted to 1 hour (`3600000 ms`) with no refresh token mechanism, causing `POST /api/dictionary/translated` to receive 401 on expired tokens and triggering `AxiosService` to wipe `localStorage` and redirect to `/login`.
  - Extended default JWT expiration to 30 days (`2592000000 ms`) in `substreamedu-iam-service-go/internal/config/config.go`.
  - Added `JWT_EXPIRATION_MS: ${JWT_EXPIRATION_MS:-2592000000}` to `docker-compose.yml` and Kubernetes deployment configs.
  - Added unit tests in `config_test.go` verifying 30-day default and custom expiration parsing.
  - Verified all 5 Go microservices pass unit tests cleanly.

- **Telegram Bot Page Container Offset & Header Responsive Fix (Completed 2026-09-12)**:
  - Root cause of content being under/higher than the header at 770–1140px: `TelegramBotPage.module.css` had `padding: 0 40px 120px;` under `@media (max-width: 1440px)` instead of `120px` top padding, causing the hero content to mount at `y = 0` underneath the fixed header (`height: 56px`).
  - Restored top padding to `120px 40px 120px;` for screen widths `<= 1440px`.
  - Fixed horizontal header overflow/truncation (`TelegramB...`) by introducing viewport width-aware navigation (`window.innerWidth <= 1140` fallback to mobile dropdown menu) and fine-tuning spacing at 1280px.
  - Added click-outside and route change dismissal for the mobile navigation dropdown.
  - Verified with production build (`npm run build`).

- **QuickStart Video Picks Instant Feedback & Resource Deduplication (Completed 2026-09-12)**:
  - Root cause of "frozen" feeling on clicking `QuickStartVideoPicks`: `handleYoutubeUrlLoad` blocked setting `videoUrl` and mounting the player behind `await YouTubeService.getVideoInfo(...)`, while the UI provided 0ms visual feedback (no loading state, no active state).
  - Eliminated blocking network fetch: `useVideoUpload.ts` now mounts the player immediately (0ms UI transition), synchronously resolves metadata from `CURATED_DEMO_VIDEOS` (or thumbnail fallback), and fetches title in the background only for custom non-curated URLs.
  - Added sub-16ms visual feedback in `QuickStartVideoPicks.tsx` & `.module.css` with active press states and spinning loader icon.
  - Resolved duplicate `GET /api/dictionary/resources/:id/items` calls in `VideoPlayer.tsx` with `lastFetchedResourceRef` deduplication guard.
  - Documented `googleads.g.doubleclick.net` notice as standard client-side ad-blocker blocking YouTube iframe tracking/ads.
  - Verified with unit tests (`QuickStartVideoPicks.test.tsx`) and production build (`npm run build`).

- **Flashcard Review Concurrency & Axios Interceptor Fix (Completed 2026-09-12)**:
  - Fixed duplicate burst requests on card rating in `Flashcards.tsx` by introducing `inFlightCardIds` ref and `isSubmitting` state guard, plus `event.repeat` suppression on key shortcuts.
  - Fixed duplicate console logs in `AxiosService.ts` by tracking interceptor IDs and ejecting existing handlers before attaching new ones.
  - Verified with unit tests (`Flashcards.test.tsx`) and successful production build (`npm run build`).

- **Spec 01 Execution (Completed 2026-09-11)**:
  - Unified all database migrations across `dictionary-service`, `media-service`, and `notification-service` using `golang-migrate/migrate/v4` with embedded SQL files and `schema_migrations` tracking.
  - Replaced ad-hoc `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `dictionary-service` with versioned `up`/`down` migrations.
  - Added composite index `idx_outbox_events_status_created ON outbox_events(status, created_at)` in `01-init.sh` and migrations.
  - Configured Caddy log rotation (`roll_size 20MiB`, `roll_keep 5`, `roll_keep_for 14d`) and persistent host volume mount (`./logs/caddy:/var/log/caddy`).
  - Added Promtail container to `docker-compose.yml` with `/var/run/docker.sock` and mounted `loki/loki-config.yml`.
  - Added pre-deployment automated database backup step (`pg_dump`) to `deploy.sh` with 15-dump retention.
  - Updated `TO_FIX.md` items 4, 5, 6, 7, 8 to completed status.
  - Verified all 5 Go microservices compile cleanly and unit tests pass with race detection.

- **Spec 02 Execution (Completed 2026-09-11)**:
  - Activated `TokenRevocation` (Redis blacklist) and `SecurityHeaders` in `substreamedu-gateway-go/cmd/gateway/main.go`.
  - Implemented `BlockInternalRoutes` middleware in API Gateway to reject external calls to `/internal/*` with HTTP 403.
  - Fixed IDOR vulnerability in `substreamedu-iam-service-go`: caller ownership verified on `GET /users/:userId` with admin override.
  - Enforced `AuthMiddleware` on all mutation routes in `substreamedu-dictionary-service-go` (`/translated`, `/item/:id/review2`, etc.) and refactored `getUserId` to extract identity strictly from JWT context.
  - Implemented JWT authentication (`AuthMiddleware`, `OptionalAuthMiddleware`) in `substreamedu-media-service-go` for subtitle upload/delete and AI generation.
  - Added unit tests for middleware and user ID spoofing resistance across services; verified all unit test suites pass.

- **Spec 03 Execution (Completed 2026-09-11)**:
  - Bound subtitle uploads in `substreamedu-media-service-go`: enforced max 5MB size limit (`413 Payload Too Large`) and streaming via `io.LimitReader`.
  - Enforced 15-second server-side deadline on AI generation endpoints (`/generate-text`, `/generate-cohesive`, `/generate-questions`, `/session-summary`) returning structured `504 Gateway Timeout` on stall.
  - Enforced 15-second deadline in `ai_media_service.go` for media educational text generation.
  - Fixed asynchronous goroutine context leaks in `AddWord` and `GetTranslationProd` by extracting zap logger safely before spawning goroutine and using `context.WithTimeout`.
  - Guarded `BackfillMissingEmbeddings` with atomic CAS to prevent duplicate concurrent executions.
  - Implemented row-by-row streaming CSV exports (`StreamDictionaryAsCsv`, `StreamResourceAsCsv`) directly into `gin.Context.Writer`.
  - Bounded Anki exports to maximum 2,500 cards per request and capped media download concurrency at 10.
  - Added unit tests for CSV streaming, size limits, and concurrency guards; verified all 5 microservices pass unit tests.

- **Spec 04 Execution (Completed 2026-09-11)**:
  - Cleaned up `tailwind.config.js`: removed legacy `#000000` primary aliases, bound color tokens directly to CSS variables (`var(--color-canvas)`, etc.), and bound typography to `e-Ukraine` and `JetBrains Mono`.
  - Replaced hardcoded `bg-[#0d0c0b]` across `App.tsx`, `Header.tsx`, and CSS Modules (`DictionaryPage`, `SubtitleViewer`, `SongSearchPlayer`, `SubtitlesPage`, `DashboardPage`) with semantic tokens (`bg-canvas`, `var(--color-canvas)`).
  - Replaced legacy color classes (`text-primary-blue`, `text-dark-grey`) in `NotFoundPage.tsx` with semantic tokens (`text-primary`, `text-body`).
  - Purged UI emojis and replaced with crisp Lucide React linear icons across `SubtitleViewer`, `StreakShareModal`, `PremiumLimitModal`, `SubscribePage`, `SongSearchResults`, `AdminDashboard`, `PaymentPage`, `GoogleDriveButton`, `YouTubeUrlInput`, `VideoPlayer`, `TextPasteHighlighter`, and `OnboardingGuideBar`.
  - Verified `npm run build` completes successfully with zero TypeScript, JSX, or bundling errors.
  - Re-ran `go test ./...` across all 5 Go services (`gateway`, `iam`, `dictionary`, `media`, `notification`) to ensure complete project health. All pass cleanly.

- **Audit Findings Summary**:
  1. *Security Vulnerabilities*: IDOR in `substreamedu-iam-service-go` (`/users/:userId`), unauthenticated mutation routes in `substreamedu-media-service-go` and `substreamedu-dictionary-service-go`, and unauthenticated `/auth/internal/*` endpoints reachable via the public gateway.
  2. *Gateway Middleware Omissions*: `TokenRevocation` and `SecurityHeaders` middlewares exist in the codebase but were never registered in `cmd/gateway/main.go`.
  3. *Database Inconsistency*: Migration strategies are fragmented across services (`golang-migrate` in IAM, runtime SQL strings in Dictionary, unversioned SQL files in Notification pointing to `sse_iam`, no migrations in Media).
  4. *Performance Hotspots*: Synchronous scraping of Reverso in HTTP thread, synchronous LLM generation calls, and synchronous in-memory APKG compilation.
  5. *Frontend Token Drift*: Legacy Tailwind aliases (`#000000`, etc.) and scattered hardcoded inline hex codes (`bg-[#0d0c0b]`) need consolidation to semantic tokens.
