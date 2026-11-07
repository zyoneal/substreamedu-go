# Spec 60: AIService Clean Architecture & SRP Refactoring (ub-mode)

- **Status**: Completed
- **Owner**: Go Dictionary Microservice (`substreamedu-dictionary-service-go`)
- **Related ADR**: ADR-135
- **Depends On**: Spec 54, Spec 59

---

## 1. Problem Statement

`substreamedu-dictionary-service-go/internal/service/ai_service.go` is **3055 lines long**, making it the largest source file in the entire repository. It violates Uncle Bob's **Single Responsibility Principle (SRP)**, **Separation of Concerns**, and Clean Architecture principles:

### Evidence (verified in code)

| # | Concern | Location in `ai_service.go` | Issues |
|---|---------|-----------------------------|--------|
| E1 | LLM HTTP Clients & Fallback Circuit Breakers | Lines 633–688, 957–1225 | Direct HTTP request building, JSON decoding, DeepSeek/Groq/Gemini calls mixed with service methods |
| E2 | Pure Algorithmic Exercises & Story Generation | Lines 1453–1965 | ~500 lines of deterministic algorithmic exercise/story/question generation with zero network/DB dependencies |
| E3 | Static Grammar Knowledge Base & Rules Catalog | Lines 2280–2629 | ~350 lines of static grammar rules, tense definitions, and heuristic string matching |
| E4 | Algorithmic Lesson Plan Templating | Lines 2754–2884 | ~130 lines of CEFR-level lesson structure templating |
| E5 | Heuristic Phrase Categorizer | Lines 2886–2970 | ~90 lines of regex-based category assignment |

---

## 2. Alternatives & Design Decisions (Design It Twice)

- **Alternative A (Full Sub-package Extraction `service/ai/`)**:
  - Move everything into a new package `internal/service/ai`.
  - *Trade-off*: Requires extensive import changes and restructuring across `LearningService`, `VocabularyService`, `CategorizationService`, and `DictionaryHandler`. Higher risk of cross-boundary cyclic imports.
- **Alternative B (Focused Service Domain Modules in `internal/service/`)**:
  - Decompose `ai_service.go` into cohesive files within `internal/service/`:
    1. `ai_provider_client.go`: Low-level LLM callers (`callDeepSeek`, `callGroq`, `callGemini`, `callWithFallback`).
    2. `ai_grammar_fallback.go`: Grammar catalog and fallback resolution (`getGrammarFallback`, `resolveGrammarFallbackRule`).
    3. `ai_exercise_generator.go`: Algorithmic exercises, stories, and question generation (`generateAlgorithmicExercises`, `generateAlgorithmicSessionStory`, `generateAlgorithmicQuestions`).
    4. `ai_lesson_generator.go`: Algorithmic lesson plan templating (`generateAlgorithmicLessonPlan`).
    5. `ai_categorizer.go`: Regex heuristics for phrase categorization (`CategorizePhrasesHeuristic`).
    6. `ai_service.go`: Thin orchestrator managing caching, orchestration, and public API.
  - *Selected*: Preserves 100% API compatibility with zero caller breakage, separates pure domain logic from network I/O, reduces `ai_service.go` by >65%.

---

## 3. Requirements

1. **R1: Isolate LLM HTTP Provider Clients (`ai_provider_client.go`)**:
   - Extract `callDeepSeek`, `callGroq`, `callGemini`, and `callWithFallback`.
   - Preserve resilient client circuit breakers (`gobreaker`).
2. **R2: Isolate Grammar Rules Catalog (`ai_grammar_fallback.go`)**:
   - Extract static grammar catalog and `resolveGrammarFallbackRule` / `getGrammarFallback`.
   - Add unit tests verifying grammar fallback output for common English structures.
3. **R3: Isolate Algorithmic Exercises & Story Generation (`ai_exercise_generator.go`)**:
   - Extract `generateAlgorithmicExercises`, `generateAlgorithmicSessionStory`, and `generateAlgorithmicQuestions`.
   - Ensure zero external dependencies.
4. **R4: Isolate Algorithmic Lesson Plan Generator (`ai_lesson_generator.go`)**:
   - Extract `generateAlgorithmicLessonPlan`.
5. **R5: Isolate Heuristic Categorization (`ai_categorizer.go`)**:
   - Extract `CategorizePhrasesHeuristic`.
6. **R6: Thin Orchestrator (`ai_service.go`)**:
   - Keep high-level translation, session summary, and batch categorization orchestration clean.
   - All Go tests in `dictionary-service` must pass without regressions.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `substreamedu-dictionary-service-go/internal/service/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`

---

## 5. Verification Checklist

1. Unit tests for grammar fallback pass cleanly.
2. Unit tests for exercise and story generation pass cleanly.
3. All tests in `substreamedu-dictionary-service-go` pass (`go test ./...`).
4. `ai_service.go` line count reduced significantly (<1200 lines).
5. `check-spec-scope.sh` verifies within boundary.
6. `./verify.sh` passes end-to-end.
