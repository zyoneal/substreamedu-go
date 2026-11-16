# Feature Spec 77: Dictionary Word Video Timestamp & Jump-to-Moment (`&t=...`)

## Context & Objectives
When learners save words or phrases while watching YouTube or URL/Google Drive videos on `/videos`, the vocabulary entry currently does not record the exact video timestamp (`timestamp_sec`) or playable HTTP(S) `source_url`. As a result, users browsing `/dictionary` or `/dictionary/resources/:resourceName` cannot jump back to the exact spoken moment in the video.

This spec adds end-to-end video timestamp capture and 1-click jump-to-moment:
1. **Database & Backend (`substreamedu-dictionary-service-go`)**:
   - Add versioned migration `000008_add_video_timestamp_and_source_url.{up,down}.sql` adding `timestamp_sec INTEGER` and `source_url TEXT` to `dictionary`.
   - Extend `model.Dictionary`, `dto.AddWordRequestDto`, `dto.DictionaryItemDto`, `DictionaryRepository` (`Save`, `UpdateLexemeContent`, `FindByID`, `FindByResourcePaginated`, `FindLexemesByResource`, `FindAllLexemes`, `FindAllPaginated`), and `VocabularyService` (`AddWord`, `mapModelToDto`) with sanitized `timestampSec` (`>= 0`) and `sourceUrl` (HTTP/HTTPS only, rejecting `blob:` URLs).
2. **Frontend (`substreamedu-frontend`)**:
   - Extend `SaveWordData` (`useDictionary.ts`) and `SubtitleService.processHighlightedTextAfterTranslation` with optional `timestampSec?: number` and `sourceUrl?: string`.
   - Capture `timestampSec` (preferring `currentSubtitle.startTimeMs`, falling back to `sessionStorage.getItem('videoCurrentTime')`) and `sourceUrl` (`http(s)://` only) in `useSubtitleTranslation.ts` (`saveToDict`).
   - Add pure utility `src/utils/videoTimestampUtils.ts` (`formatTimestampSec`, `buildVideoJumpUrl`) with unit tests (`videoTimestampUtils.test.ts`).
   - Render a clean timestamp badge / jump-to-video link (`/videos?videoUrl=...&t=...`) in `DictionaryTermsList.tsx` (`DictionaryItemsPage`) and `DictionaryWordCard.tsx` (`DictionaryPage`). For local `blob:` videos without a playable URL, display the formatted timestamp badge (`04:12`) as read-only context.

## Allowed files
- `context/feature_specs/77_dictionary_video_timestamp_jump.md`
- `context/progress_tracker.md`
- `context/feature_backlog.md`
- `substreamedu-dictionary-service-go/internal/repository/migrations/000008_add_video_timestamp_and_source_url.up.sql`
- `substreamedu-dictionary-service-go/internal/repository/migrations/000008_add_video_timestamp_and_source_url.down.sql`
- `substreamedu-dictionary-service-go/internal/model/models.go`
- `substreamedu-dictionary-service-go/internal/dto/dto.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-dictionary-service-go/internal/service/vocabulary_service.go`
- `substreamedu-dictionary-service-go/internal/service/vocabulary_service_test.go`
- `substreamedu-frontend/src/hooks/useDictionary.ts`
- `substreamedu-frontend/src/services/SubtitleService.ts`
- `substreamedu-frontend/src/components/VideoPage/hooks/useSubtitleTranslation.ts`
- `substreamedu-frontend/src/utils/videoTimestampUtils.ts`
- `substreamedu-frontend/src/utils/videoTimestampUtils.test.ts`
- `substreamedu-frontend/src/components/DictionaryItemsPage/useDictionaryItemsSession.ts`
- `substreamedu-frontend/src/components/DictionaryItemsPage/DictionaryTermsList.tsx`
- `substreamedu-frontend/src/components/DictionaryItemsPage/css/DictionaryItemsPage.module.css`
- `substreamedu-frontend/src/components/DictionaryPage/utils/dictionaryUtils.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/components/DictionaryWordCard.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`

## Acceptance Criteria
1. Saving a word from a video persists `timestamp_sec` (`>= 0`) and valid `http(s)://` `source_url` (never `blob:` URLs) on both recognition and production cards.
2. Dictionary API responses (`DictionaryItemDto`) include `timestampSec` and `sourceUrl` when present.
3. `DictionaryTermsList` and `DictionaryWordCard` render a formatted timestamp badge (`mm:ss` or `h:mm:ss`) and, for YouTube (`yt:<id>`) or HTTP(S) `sourceUrl` items, link directly to `/videos?videoUrl=...&t=<sec>`.
4. `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm test -- --watchAll=false` pass cleanly.
