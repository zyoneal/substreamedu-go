# Feature Spec 76: Custom SRS Session Filters (`/learning`)

## Context & Objectives
Users on `/learning` currently receive a single global daily queue from `GET /api/dictionary/srs/today` without any way to focus a review session on a specific video/book (`resource_name`), vocabulary category (`category`), or item granularity (`words` vs `phrases`). This was one of the top-requested features on the Language Reactor community forum.

This spec adds end-to-end SRS session filtering:
1. **Backend (`substreamedu-dictionary-service-go`)**:
   - Introduce `dto.SessionFilter` (`ResourceName`, `Category`, `ItemKind` in `{"", "all", "words", "phrases"}`).
   - Add a shared SQL filter builder `buildSessionFilterClause` in `dictionary_repository.go` and filtered repository methods (`FindDueWordsSortedFiltered`, `FindRandomNewWordsFiltered`, `FindNewRecognitionCardsFiltered`, `FindUnlockedNewProductionCardsFiltered`), keeping existing methods as zero-filter wrappers for full backward compatibility.
   - Add `LearningService.GetDailyCardsWithFilter` (with `GetDailyCards` delegating with an empty filter).
   - Parse optional query parameters `resource`, `category`, and `kind` in `DictionaryHandler.GetDailyCards`.
2. **Frontend (`substreamedu-frontend`)**:
   - Extend `DictionaryService.fetchSRSToday(filters?)` to pass non-empty `resource`, `category`, and `kind` query params.
   - Extend `useFlashcardsSession` to track `filters`, initialize from URL search params if present, key `localStorage` session persistence by filter signature so changing filters starts a clean filtered queue, and expose `setFilters` / `resetFilters` / `hasActiveFilters`.
   - Create `SessionFilterBar.tsx` with a segmented `All / Words / Phrases` toggle, `Source` selector (from `fetchDictionaryResources`), `Category` selector (from `fetchDictionaryCategories`), and a `Reset` action using Pixzen Light design tokens (no raw hex values, no emojis).
   - Wire `SessionFilterBar` into `Flashcards.tsx` and provide a filter-aware empty state with a 1-click "Reset filters" button when a filter yields 0 cards.

## Allowed files
- `context/feature_specs/76_srs_session_filters.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-dictionary-service-go/internal/repository/due_filter_test.go`
- `substreamedu-dictionary-service-go/internal/service/learning_service.go`
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler_test.go`
- `substreamedu-frontend/src/services/DictionaryService.ts`
- `substreamedu-frontend/src/hooks/useDictionary.ts`
- `substreamedu-frontend/src/components/LearningPage/hooks/useFlashcardsSession.ts`
- `substreamedu-frontend/src/components/LearningPage/components/SessionFilterBar.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.test.tsx`
- `substreamedu-frontend/src/locales/en.json`

## Acceptance Criteria
1. `GET /api/dictionary/srs/today` accepts optional `resource`, `category`, and `kind` (`words` | `phrases` | `all`) query parameters and filters due + new cards consistently while preserving existing behavior when omitted.
2. `buildSessionFilterClause` uses parameterized SQL placeholders (`$N`) with zero string interpolation of user input.
3. `/learning` renders `SessionFilterBar` allowing users to filter by item kind (`All`, `Words`, `Phrases`), source (`resource`), and `category`, and reset filters in one click.
4. Changing any filter fetches a fresh filtered session from `DictionaryService.fetchSRSToday(filters)` without restoring stale unfiltered cards from `localStorage`.
5. `./verify.sh` passes cleanly on the final `HEAD` SHA.
