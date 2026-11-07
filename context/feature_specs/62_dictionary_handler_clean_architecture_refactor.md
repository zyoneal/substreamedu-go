# Spec 62: DictionaryHandler Clean Architecture & SRP Refactoring (ub-mode)

- **Status**: Completed
- **Owner**: Go Dictionary Microservice (`substreamedu-dictionary-service-go`)
- **Related ADR**: ADR-137
- **Depends On**: Spec 61

---

## 1. Problem Statement

`substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go` is **1156 lines long**, serving as an oversized God Object HTTP handler. It mixes multiple unrelated HTTP routing and binding responsibilities:

### Evidence (verified in code)

| # | Concern | Location in `dictionary_handler.go` | Issues |
|---|---------|------------------------------------|--------|
| E1 | AI Text, Sentence & Grammar Generation Endpoints | Lines 582–762 | 180 lines of Gin JSON binding, timeout contexts (15s), gateway timeouts, and error mappings for AI tools |
| E2 | Teacher Lesson Builder Handlers | Lines 897–1032 | 135 lines of JSON binding and repository calls for generating, saving, sharing, and deleting lesson plans |
| E3 | Vocabulary Categorization Handlers | Lines 1034–1155 | 121 lines of batch categorization, category querying, and cursor pagination |
| E4 | Export Handlers (CSV & Anki) | Lines 808–895 | 87 lines of HTTP headers, binary octet streaming, and error checks for CSV and Anki packages |
| E5 | Translation & NounProject Visual Fetching | Lines 422–580 | 158 lines of translation JSON parsing, fallback field mapping, visual keyword icon fetching, and IAM usage incrementation |

---

## 2. Alternatives & Design Decisions (Design It Twice)

- **Alternative A (Split into Independent Gin Controller Structs)**:
  - Create separate struct types `AIHandler`, `LessonHandler`, `ExportHandler`, `CategorizationHandler`.
  - *Trade-off*: Requires modifying `router.Setup` signature, `main.go`, and test fixtures across multiple packages.
- **Alternative B (Focused Method Handlers within `package handler` on `*DictionaryHandler`)**:
  - Keep `DictionaryHandler` struct intact to preserve 100% ABI compatibility for `router.Setup` and `main.go`, while decomposing implementation files by domain:
    1. `dictionary_ai_handler.go`: Endpoints for `GenerateTextByLevel`, `GenerateCohesiveText`, `GenerateQuestions`, `GenerateSessionSummary`, `GeneratePracticeExercises`, `EvaluateSentence`, `AnalyzeGrammar`.
    2. `dictionary_translation_handler.go`: Endpoint for `GetTranslationProd` and helper `mapCompatibilityFields`.
    3. `dictionary_lesson_handler.go`: Endpoints for `GenerateLessonPlan`, `SaveLessonPlan`, `GetSharedLessonPlan`, `GetMyLessons`, `DeleteLessonPlan`.
    4. `dictionary_export_handler.go`: Endpoints for `ExportCsv`, `ExportResourceCsv`, `ExportAnki`, `ExportResourceAnki`.
    5. `dictionary_categorization_handler.go`: Endpoints for `CategorizeWordsBatch`, `GetVocabularyCategories`, `GetLexemesByCategory`.
    6. `dictionary_handler.go`: Core dictionary CRUD, daily cards, SRS reviews, streak, and utility auth methods (~400 lines).
  - *Selected*: Zero risk of breaking `router.Setup`, preserves all method sets on `*DictionaryHandler`, reduces `dictionary_handler.go` from 1156 to ~400 lines (>65% reduction).

---

## 3. Requirements

1. **R1: Isolate AI Generation Handlers (`dictionary_ai_handler.go`)**:
   - Extract AI endpoints with their 15s timeout handling.
   - Verify all tests in `dictionary_handler_test.go` (`TestAIGeneration_ValidationAndTimeout`) pass.
2. **R2: Isolate Translation & Visual Keyword Icon Handlers (`dictionary_translation_handler.go`)**:
   - Extract `GetTranslationProd` and `mapCompatibilityFields`.
3. **R3: Isolate Lesson Builder Handlers (`dictionary_lesson_handler.go`)**:
   - Extract all 5 lesson builder endpoints.
4. **R4: Isolate Export Handlers (`dictionary_export_handler.go`)**:
   - Extract CSV streaming and Anki binary export endpoints.
5. **R5: Isolate Categorization Handlers (`dictionary_categorization_handler.go`)**:
   - Extract batch categorization and category lexeme querying.
6. **R6: Clean Core Handler (`dictionary_handler.go`)**:
   - Retain auth extraction, word addition/deletion, pagination, and SRS review routes.
7. **R7: Definition of Done**:
   - `./verify.sh` passes end-to-end.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `substreamedu-dictionary-service-go/internal/handler/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`

---

## 5. Verification Checklist

1. Handler unit tests pass (`go test -v ./internal/handler/...`).
2. Service unit tests pass (`go test -v ./internal/service/...`).
3. `dictionary_handler.go` line count reduced to <450 lines.
4. `check-spec-scope.sh` verifies within boundary.
5. `./verify.sh` passes end-to-end.
