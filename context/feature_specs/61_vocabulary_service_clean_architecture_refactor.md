# Spec 61: VocabularyService Clean Architecture & SRP Refactoring (ub-mode)

- **Status**: Completed
- **Owner**: Go Dictionary Microservice (`substreamedu-dictionary-service-go`)
- **Related ADR**: ADR-136
- **Depends On**: Spec 60

---

## 1. Problem Statement

`substreamedu-dictionary-service-go/internal/service/vocabulary_service.go` is **1212 lines long**, making it the largest remaining service file in the backend. It violates Uncle Bob's **Single Responsibility Principle (SRP)**, combining several distinct concerns into one monolithic struct:

### Evidence (verified in code)

| # | Concern | Location in `vocabulary_service.go` | Issues |
|---|---------|------------------------------------|--------|
| E1 | Anki Package & CSV Export Generation | Lines 602–978 | 376 lines of GenAnki HTML/CSS templates, dual straight/reversed note models, zip packaging, concurrent TTS audio download, and CSV escaping |
| E2 | Async Image Downloader & SSRF Protection | Lines 1018–1210 | 192 lines of custom HTTP safe transport, SSRF DNS/IP checks, streaming limit readers, and media filesystem storage |
| E3 | Streak & SRS Statistics Calculation | Lines 372–488 | 116 lines of timezone date manipulation, weekly array mapping, and continuous streak counting |
| E4 | Cache Coordination & Redis Light Hashing | Lines 194–225, 409–417, 523–579 | Redis hash pipelines, distributed locking, and cache invalidation routines |

---

## 2. Alternatives & Design Decisions (Design It Twice)

- **Alternative A (Full Sub-package Extraction `service/export/`, `service/media/`)**:
  - Move export and image downloading to separate sub-packages.
  - *Trade-off*: Would break external package dependencies or require cyclic imports back to repository models and DTOs.
- **Alternative B (Focused Domain Seams within `package service`)**:
  - Keep everything in `package service` to preserve 100% ABI and signature compatibility for `DictionaryHandler`, `LearningService`, and unit tests:
    1. `vocabulary_export.go`: Anki deck/model building (`generateAnkiPackage`, `ExportDictionaryAsAnki`, `ExportResourceAsAnki`), audio downloading (`getHumanAudioURL`), CSV streaming (`StreamDictionaryAsCsv`, `StreamResourceAsCsv`, `streamCsv`, `escapeCsv`).
    2. `vocabulary_image_downloader.go`: Async safe image downloading (`downloadAndStoreImageAsync`) and SSRF protection (`IsSafePublicImageURL`).
    3. `vocabulary_stats.go`: Streak calculation (`CalculateStreak`, `CalculateStreakInfo`) and SRS statistics (`GetDictionaryStats`, `InvalidateSRSStatsCache`, `GetTopUsersByWordCount`).
    4. `vocabulary_service.go`: Clean CRUD orchestrator for word additions, deletions, pagination, and group caching (~450 lines).
  - *Selected*: Zero risk of breaking consumers, preserves all method sets on `*VocabularyService`, reduces `vocabulary_service.go` by >60%.

---

## 3. Requirements

1. **R1: Isolate Export Engine (`vocabulary_export.go`)**:
   - Extract Anki packaging, TTS/human audio fetching, and CSV streaming.
   - Maintain full fidelity of dual straight/reversed models and CSS formatting.
2. **R2: Isolate Safe Image Downloader (`vocabulary_image_downloader.go`)**:
   - Extract SSRF validation, DNS resolution checks, streaming limit reader, and local disk caching.
   - Verify all existing SSRF unit tests in `vocabulary_service_ssrf_test.go` pass.
3. **R3: Isolate Streak & SRS Stats Engine (`vocabulary_stats.go`)**:
   - Extract streak calculation and weekly status array logic.
   - Verify `streak_timezone_test.go` passes cleanly.
4. **R4: Clean Core Service (`vocabulary_service.go`)**:
   - Retain core dictionary persistence, pagination, and cache coordination.
5. **R5: Definition of Done**:
   - `./verify.sh` passes end-to-end.

---

## 4. Allowed files (Strict File Boundaries)

Touch **only** the following files:
- `substreamedu-dictionary-service-go/internal/service/**`
- `context/feature_specs/**`
- `context/progress_tracker.md`

---

## 5. Verification Checklist

1. SSRF unit tests pass (`go test -v ./internal/service -run "TestIsSafePublicImageURL"`).
2. Streak timezone unit tests pass (`go test -v ./internal/service -run "TestStreakTimezone"`).
3. All service tests pass (`go test ./internal/service/...`).
4. `vocabulary_service.go` line count reduced to <550 lines.
5. `check-spec-scope.sh` verifies within boundary.
6. `./verify.sh` passes end-to-end.
