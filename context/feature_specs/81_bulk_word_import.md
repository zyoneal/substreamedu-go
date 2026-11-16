# Feature Spec 81: Bulk Word Import (CSV / TXT / Paste)

## Context & Objectives
Learners migrating from Anki, spreadsheets, or external wordlists requested the ability to import lists of English words into their SubStreamEdu dictionary rather than adding every word one by one.

This spec adds end-to-end bulk vocabulary import:
1. **Backend (`substreamedu-dictionary-service-go`)**:
   - Add `dto.ImportWordItemDto`, `dto.ImportWordsRequestDto` (`1..200` items per batch to stay well within the 10s sync HTTP ceiling), and `dto.ImportWordsResponseDto` (`importedCount`, `skippedCount`).
   - Add `VocabularyService.ImportWords` creating linked Recognition (`card_type=0`) and Production (`card_type=1`) cards while deduplicating against `FindExistingLexeme` in the target `resourceName` (defaulting to `"Imported Vocabulary"`).
   - Add `POST /api/dictionary/import` (`DictionaryHandler.ImportWords`) under `mutations` (`AuthMiddleware` + `IdempotencyMiddleware`).
2. **Frontend (`substreamedu-frontend`)**:
   - Add pure parser `src/components/DictionaryPage/utils/importParser.ts` + unit tests (`importParser.test.ts`) supporting `.csv` (quoted CSV), `.tsv` (tab-separated), `;`, `word - translation`, and one-word-per-line formats, skipping common CSV header rows and capping at 200 items per batch.
   - Add `DictionaryService.importDictionaryWords(resourceName, items)`.
   - Add `DictionaryImportModal.tsx` (file upload + paste textarea + live preview + result feedback) and wire an `Import` button beside `Export Anki` in `DictionaryPage.tsx` (triggering `refetch` / reload on completion).

## Allowed files
- `context/feature_specs/81_bulk_word_import.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/service/vocabulary_service.go`
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`
- `substreamedu-dictionary-service-go/internal/router/router.go`
- `substreamedu-frontend/src/services/DictionaryService.ts`
- `substreamedu-frontend/src/components/DictionaryPage/utils/importParser.ts`
- `substreamedu-frontend/src/components/DictionaryPage/utils/importParser.test.ts`
- `substreamedu-frontend/src/components/DictionaryPage/components/DictionaryImportModal.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/hooks/useDictionaryData.ts`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`

## Acceptance Criteria
1. `POST /api/dictionary/import` requires JWT auth, validates `1 <= len(items) <= 200`, deduplicates existing words in `resourceName`, and returns `{ importedCount, skippedCount }`.
2. `parseImportText` accurately parses CSV (including quoted commas), TSV, semicolon, dash-separated, and plain word-per-line inputs while skipping header rows.
3. Users can open the Import modal from `/dictionary`, upload a `.csv`/`.txt` file or paste lines, preview parsed items, and import them into their dictionary.
4. `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm test -- --watchAll=false` pass cleanly.
