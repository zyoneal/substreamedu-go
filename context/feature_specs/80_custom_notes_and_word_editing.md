# Feature Spec 80: Custom Notes, Mnemonics & Persistent Word Editing

## Context & Objectives
Learners requested the ability to attach personal notes, mnemonics, and custom definitions to saved words and review them during SRS sessions. Currently, `DictionaryEditModal` on `/dictionary` only mutates local React state without persisting to the backend, and the existing `note` database column is not exposed on `model.Dictionary`, `DictionaryItemDto`, `/srs/today`, or `Flashcard.tsx`.

This spec implements end-to-end persistent word editing & personal notes:
1. **Backend (`substreamedu-dictionary-service-go`)**:
   - Expose `Note` (`COALESCE(note, '')`) on `model.Dictionary`, `dto.DictionaryItemDto`, `DictionaryRepository` (`FindByID`, `Save`, `FindDueWordsSortedFiltered`, `FindRandomNewWordsFiltered`, `FindNewRecognitionCards`, `FindUnlockedNewProductionCards`, `FindLexemesByResourcePaginated`, `FindLexemesByResource`, `FindAllLexemes`, `FindAllLexemesPaginated`), `VocabularyService.mapModelToDto`, and `LearningService.mapCardToDto`.
   - Add `dto.UpdateWordRequestDto` and `PATCH /api/dictionary/items/:id` (`DictionaryHandler.UpdateWord` -> `VocabularyService.UpdateWord` -> `DictionaryRepository.UpdateWordWithSiblings`), enforcing JWT ownership (`userId` from `c.Get("userId")`) and updating both recognition and production sibling cards.
2. **Frontend (`substreamedu-frontend`)**:
   - Add `DictionaryService.updateDictionaryItem(id, payload)` (`PATCH /api/dictionary/items/${id}`).
   - Add a `Personal Note / Mnemonic` field to `DictionaryEditModal.tsx` and persist edits from `useDictionaryData.ts` (`handleSaveWord`).
   - Display saved notes on `DictionaryWordCard.tsx` and on the revealed back side of `Flashcard.tsx` (passed from `Flashcards.tsx`).

## Allowed files
- `context/feature_specs/80_custom_notes_and_word_editing.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/model/models.go`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-dictionary-service-go/internal/service/vocabulary_service.go`
- `substreamedu-dictionary-service-go/internal/service/learning_service.go`
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`
- `substreamedu-dictionary-service-go/internal/router/router.go`
- `substreamedu-frontend/src/services/DictionaryService.ts`
- `substreamedu-frontend/src/components/DictionaryPage/components/DictionaryEditModal.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/hooks/useDictionaryData.ts`
- `substreamedu-frontend/src/components/DictionaryPage/components/DictionaryWordCard.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcards.tsx`

## Acceptance Criteria
1. `PATCH /api/dictionary/items/:id` updates `translated_text`, `definition`, `context`, and `note` for the authenticated user's card and its sibling card, returning `200 OK` with the updated `DictionaryItemDto` (or `404`/`403` when not found/owned).
2. Editing a word in `DictionaryEditModal` persists changes via `DictionaryService.updateDictionaryItem` and displays the note on `DictionaryWordCard`.
3. `Flashcard` displays the user's `note` when revealed (`revealLevel >= 1`).
4. `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm test -- --watchAll=false` pass cleanly.
