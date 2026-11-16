# Feature Spec 82: SRS-Status Color Coding in Subtitles & Books

## Context & Objectives
Saved words in `/videos` subtitles and `/books` reader currently use a single uniform highlight style regardless of whether the learner just saved the word (`new`), is actively reviewing it (`learning`), or has already mastered it (`review` with `repetitionLevel >= 3`). Users requested visual differentiation so they can track their vocabulary mastery at a glance while watching or reading.

This spec adds SRS-tier color coding across backend light-lexeme payloads, video subtitles, and the book reader:
1. **Backend (`substreamedu-dictionary-service-go`)**:
   - Extend `dto.LexemeLightDto` and `DictionaryRepository` (`FindAllLexemesLightPaginated`, `FindAllLexemesLight`) with `status` (`string`) and `repetitionLevel` (`int`).
2. **Frontend (`substreamedu-frontend`)**:
   - Add pure `getSrsTier(status?, repetitionLevel?)` helper (`'new' | 'learning' | 'mastered'`) in `src/utils/srsStatusUtils.ts` with unit tests (`srsStatusUtils.test.ts`).
   - Preserve `status` and `repetitionLevel` on `DictionaryItem` (`VideoPage/types.ts`) and when normalizing `userDictionaryItems` in `VideoPlayer.tsx`.
   - Apply tier classes (`srsNew`, `srsLearning`, `srsMastered`) and `data-srs-tier` in `subtitleHighlightUtils.tsx` + `VideoPlayerPopover.module.css`.
   - Apply tier classes (`highlightedNew`, `highlightedLearning`, `highlightedMastered`) and `data-srs-tier` in `BookContent.tsx` + `BookReader.module.css`.

## Allowed files
- `context/feature_specs/82_srs_status_color_coding.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-frontend/src/utils/srsStatusUtils.ts`
- `substreamedu-frontend/src/utils/srsStatusUtils.test.ts`
- `substreamedu-frontend/src/components/VideoPage/types.ts`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`
- `substreamedu-frontend/src/components/VideoPage/utils/subtitleHighlightUtils.tsx`
- `substreamedu-frontend/src/components/VideoPage/css/VideoPlayerPopover.module.css`
- `substreamedu-frontend/src/components/BooksPage/components/BookContent.tsx`
- `substreamedu-frontend/src/components/BooksPage/css/BookReader.module.css`

## Acceptance Criteria
1. `GET /api/dictionary/resources/items/light` returns `status` and `repetitionLevel` for each lexeme.
2. `getSrsTier` maps `review` + `repetitionLevel >= 3` to `'mastered'`, `learning`/`review` (<3) to `'learning'`, and `new`/unset to `'new'`.
3. `renderHighlightedSubtitle` and `BookContent` render distinct tier classes and `data-srs-tier` attributes for `new`, `learning`, and `mastered` words.
4. `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm test -- --watchAll=false` pass cleanly.
