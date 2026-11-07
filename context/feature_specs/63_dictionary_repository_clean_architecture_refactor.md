# Spec 63: DictionaryRepository Clean Architecture & SRP Refactoring (ub-mode)

- **Status**: Completed
- **Owner**: Go Dictionary Microservice (`substreamedu-dictionary-service-go`)
- **Related ADR**: ADR-138
- **Depends On**: Spec 62

---

## 1. Problem Statement

`substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go` is **973 lines long**, combining multiple distinct repository concerns into a single monolithic file:

### Evidence (verified in code)

| # | Concern | Location in `dictionary_repository.go` | Issues |
|---|---------|---------------------------------------|--------|
| E1 | Vocabulary Categorization & Global Phrase Categories | Lines 767–971 | ~205 lines of query building, SQL mapping, JSON/array parameters, and cursor pagination for uncategorized words, phrase categories, category groups, and batch updates. |
| E2 | SRS Review Logs, Global/User Resets & Dictionary Stats | Lines 594–761 | ~168 lines of review logging with transactional `DB` interface, review dates timezone projection, aggregate SQL statistics computation with session limits, and admin resets. |
| E3 | Core CRUD, Word Retention, Resource Queries & Cards | Lines 1–593, 762–765 | ~600 lines of word inserts, updates with optimistic locking, due cards queries, new recognition/production card queries, and resource pagination. |

---

## 2. Alternatives & Design Decisions (Design It Twice)

- **Alternative A (Decompose into Multiple Sub-Repositories with New Struct Types)**:
  - Create `CategorizationRepository` and `StatsRepository` as separate structs and interfaces.
  - *Trade-off*: Requires updating service constructors, wire injection, and multiple unit test suites across `substreamedu-dictionary-service-go`.
- **Alternative B (Focused Method Extensions within `package repository` on `*DictionaryRepository`)**:
  - Keep `DictionaryRepository` struct intact to maintain 100% ABI compatibility with `VocabularyService`, `CategorizationService`, and `LearningService`.
  - Decompose implementation files across cohesive repository modules:
    1. `dictionary_categorization_repository.go`: `FindUncategorizedLexemes`, `CountCategorizationStats`, `FindGlobalPhraseCategories`, `SaveGlobalPhraseCategories`, `BatchUpdateCategories`, `FindVocabularyCategories`, `FindLexemesByCategoryPaginated`.
    2. `dictionary_stats_repository.go`: `SaveReviewLog`, `GetUserReviewDates`, `GetDictionaryStats`, `GetTopUsersByWordCount`, `ResetAllSRSProgress`, `ResetAllSRSProgressGlobal`.
    3. `dictionary_repository.go`: Core CRUD (`FindByID`, `Save`, `SaveTx`, `SaveTxOptimistic`, `DeleteWord`, `DeleteByResource`, `UpdateImageUrl`), card selection (`FindDueWordsSorted`, `FindRandomNewWords`, `FindNewRecognitionCards`, `FindUnlockedNewProductionCards`), and resource lexeme pagination (~600 lines).
  - *Selected*: Zero risk of breaking callers, preserves all method sets on `*DictionaryRepository`, achieves clean SRP separation.

---

## 3. Requirements

1. **R1: Isolate Categorization Repository Methods (`dictionary_categorization_repository.go`)**:
   - Extract uncategorized lexemes, phrase categories, batch updating, and category pagination.
2. **R2: Isolate Stats & Review Logs Repository Methods (`dictionary_stats_repository.go`)**:
   - Extract `SaveReviewLog`, `GetUserReviewDates`, `GetDictionaryStats`, `GetTopUsersByWordCount`, and SRS resets.
3. **R3: Clean Core Dictionary Repository (`dictionary_repository.go`)**:
   - Keep core CRUD, optimistic locking, `DB` interface, card queries, and resource listings.
4. **R4: Strict Behavioral Regression Prevention**:
   - All existing repository tests (`internal/repository/...`) and service tests (`internal/service/...`) must pass 100%.
5. **R5: Definition of Done**:
   - `./verify.sh` passes cleanly end-to-end.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `substreamedu-dictionary-service-go/internal/repository/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`

---

## 5. Verification Checklist

1. Repository unit tests pass (`go test -v ./internal/repository/...`).
2. Service unit tests pass (`go test -v ./internal/service/...`).
3. `dictionary_repository.go` line count reduced to ~600 lines.
4. `check-spec-scope.sh` passes without boundary errors.
5. `./verify.sh` passes end-to-end.
