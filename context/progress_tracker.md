# SubStreamEdu: Progress Tracker

## Status Board

- **Current Phase**: Phase 2: Product Feature Expansion & Engineering Excellence
- **In Progress**: None
- **Backlog**: None
- **Recent Completed**:
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
