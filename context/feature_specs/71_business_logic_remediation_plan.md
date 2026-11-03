# Spec 71: Full-Stack Business Logic Remediation Plan

## Status
- **Phase**: In Progress
- **Date**: 2026-11-03

## Allowed files
- `context/feature_specs/71_business_logic_remediation_plan.md`
- `context/progress_tracker.md`
- `.autopilot/PROGRESS.md`
- `substreamedu-dictionary-service-go/**`
- `substreamedu-iam-service-go/**`
- `substreamedu-notification-service-go/**`
- `substreamedu-media-service-go/**`
- `substreamedu-gateway-go/**`
- `substreamedu-frontend/src/**`

---

## Master Execution Checklist

### Phase 1: Dictionary, Card Lifecycle, FSRS Security & Anki Export (`substreamedu-dictionary-service-go`)
- [x] **1.1 Cascading Sibling Deletion & Safe Nil Guard (`DeleteWord`)**:
  - Delete both Recognition (`card_type = 0`) and Production (`card_type = 1`) cards when deleting a word so orphaned Production cards never unlock in SRS.
  - Guard against `word == nil` dereference in `VocabularyService.DeleteWord` when `FindByID` returns no record.
  - Make sibling matching case-insensitive (`LOWER(s.highlighted_text) = LOWER(d.highlighted_text)`) in `findUnlockedNewProductionCardsSQL` and `GetDictionaryStats`.
- [x] **1.2 Deduplication & Field Persistence on Word Save (`AddWord`)**:
  - Check if `(user_id, LOWER(highlighted_text), resource_name)` already exists before inserting duplicate Recognition/Production cards or charging a second quota unit; if it exists, update the existing cards' translation/definition/context/transcription/image in place and return `alreadyExists: true` to skip quota increment.
  - Persist `Note` and `ExtendedContext` from `AddWordRequestDto` into `model.DictionaryItem` and PostgreSQL.
- [x] **1.3 Exact Resource Name Matching**:
  - Replace `resource_name ILIKE '%' || $2 || '%'` with exact `resource_name = $2` in `FindLexemesByResourcePaginated`, `CountLexemesByResource`, `FindLexemesByResource`, and `DeleteByResource` so viewing, exporting, or deleting `"Friends"` never corrupts or deletes `"Friends Season 2"`.
- [x] **1.4 `ReviewCard` Ownership Check (IDOR Fix) & Timezone-Parameterized SQL**:
  - Verify `card.UserID == authenticatedUserID` in `DictionaryHandler.ReviewCard` / `LearningService.ReviewCardWithLocation`.
  - Parameterize `todayStart` (`$3`) in `findUnlockedNewProductionCardsSQL` instead of hardcoded PostgreSQL `CURRENT_DATE` so `GetDailyCards` and `GetDictionaryStats` use identical local dates.
- [x] **1.5 Anki (`.apkg`) & CSV Export Fixes**:
  - Load locally cached images (`/videos/images/words/...`) from `SHARED_MEDIA_DIR` during Anki `.apkg` generation.
  - Validate remote `http(s)` image URLs with `IsSafePublicImageURL` and safe transport in `generateAnkiPackage` (closing SSRF), and clear unsafe URLs when `IsSafePublicImageURL` fails in `downloadAndStoreImageAsync`.
  - HTML-escape card fields in Anki note templates and sanitize `Content-Disposition` filenames in `dictionary_export_handler.go`.

### Phase 2: AI Translation, Caching, Language Pairs & Quotas (`substreamedu-dictionary-service-go`)
- [x] **2.1 Collision-Free AI Cache Keys**:
  - Include `LearningLanguage` and `ExtendedContext` in `TranslateWithContext` Redis cache key (`ai:translation:v3.4:...`).
  - Include `BaseText` and word meanings in `GenerateCohesiveText` and `GenerateQuestions` cache keys.
- [x] **2.2 Fair Quota Charging & Valid-JSON-Only Caching**:
  - Do not cache malformed/unparseable LLM responses in Redis.
  - Only increment the user's `translation` usage quota when a valid translation was freshly generated (never on `"cached"` hits or parse errors).
- [ ] **2.3 Multi-Language Prompt & Icon Search Accuracy**:
  - Use the requested `LearningLanguage` and `FluentLanguage` in `ai_prompts.go` and `ai_service.go` instead of hardcoded `"English"`.
  - Do not query NounProject with multi-word `Definition` when the LLM intentionally returns `visual_keyword: ""` for abstract/grammatical words.
- [x] **2.4 `GenerateSessionSummary` Timeout Alignment**:
  - Increase handler timeout in `dictionary_ai_handler.go` (`GenerateSessionSummary`) to `45s` so Stage 1 + Stage 2 LLM calls do not time out at `15s` and produce mismatched hybrid stories.

### Phase 3: IAM, Quotas, Promo Codes, Gateway & Security (`substreamedu-iam-service-go`, `substreamedu-gateway-go`, `substreamedu-frontend`)
- [x] **3.1 IAM Authorization & OAuth Verification Fixes**:
  - Fix `UserHandler.GetUserDetails` type assertion (`authUserIDVal.(string)` + `uuid.Parse`) to block cross-user IDOR and `telegramToken` leakage.
  - Move `/auth/internal/user/by-telegram-token/:token` behind `InternalServiceKeyAuth`.
  - Enforce `emailVerified == true` in `GoogleAuthService.VerifyToken`.
- [x] **3.2 Telegram Token Lifecycle & OTP Security**:
  - Initialize `TelegramToken` in `model.NewUser(email)` so Email/OTP users never get `?start=undefined`, and stop overwriting existing users' `TelegramToken` on unauthenticated `POST /auth/login`.
  - Fix `OTPCache.Get` / `IncrementAttempts` so brute-force blocking after 3 failed attempts works, and remove plaintext OTP values from `INFO` logs.
- [ ] **3.3 Atomic Usage Counters & Word Deletion Quota Decrement**:
  - Replace read-modify-write in `UsageHandler.IncrementUsage` with atomic SQL increments (`translation_count = translation_count + 1`, `saved_words_count = saved_words_count + 1`) so concurrent updates never overwrite `is_premium` or drop increments.
  - Add `DecrementUsage` (`saved_words_count = GREATEST(0, saved_words_count - $2)`) in `iam-service` and call it from `dictionary-service` on `DeleteWord` and `DeleteResource`.
- [x] **3.4 Frontend Promo Activation & Quota Error Handling**:
  - Fix `usePromo.ts` to read `response.data?.token` and `response.data?.message` (unwrapped by `AxiosService`) so the new Premium JWT is saved to `localStorage`.
  - Distinguish IAM `503/500` verification errors from genuine `403 Limit Reached` so temporary network blips do not show fake paywall modals to Premium users.
- [x] **3.5 Gateway CORS & IAM Analytics Fixes**:
  - Add `PATCH` to `Access-Control-Allow-Methods` and `X-Timezone, X-User-Email, X-User-Id, Idempotency-Key` to `Access-Control-Allow-Headers` in `substreamedu-gateway-go`.
  - Fix `analytics_repository.go` (`sse_user` table name and accurate funnel counting) and stop fabricating `guestUserId` as an authenticated `userId` in `AnalyticsService.ts`.

### Phase 4: Telegram Bot & Notification Service (`substreamedu-notification-service-go`)
- [x] **4.1 Persistent Review Sessions & Callback Validation**:
  - Persist `ReviewSession` state (`SaveSession`) on every step (`sendNextWord` / `handleRating`), fix `tryRestoreSession` index handling so active words aren't skipped or replayed from index 0, and verify `wordID == currentWord.ID` in `handleRating`.
- [x] **4.2 Idempotent Daily Reminder Cron & Safe `/random_word`**:
  - Track the last triggered date in `StartDailyReviewJob` so container restarts after 09:00 do not spam all users again on the same day.
  - Do not overwrite an active multi-word `/review` session when a user invokes `/random_word`.
- [x] **4.3 Telegram Markdown Escaping, Local Image Support & Event Schema Alignment**:
  - Escape `word.Transcription` and backticks in `telegram.go` messages.
  - Resolve relative `/videos/images/words/...` paths in `sendPhoto` (or skip invalid relative URLs cleanly).
  - Align `WordReviewedEvent` JSON tags (`cardId`, `reviewedAt`) in `notification-service/internal/dto/dto.go`.

### Phase 5: Media Service & Frontend User Flows (`substreamedu-media-service-go`, `substreamedu-frontend`)
- [x] **5.1 Subtitle Re-Upload & Validation (`media-service`)**:
  - Replace existing subtitles in `SubtitleService.UploadSubtitles` when a user uploads a new subtitle with the same `fileName` (and invalidate Redis cache), and return an error if the parsed subtitle contains 0 cues.
  - Add nil-safety checks in `youtube.go` (`Thumbnails.High`, `Statistics`) and enforce `claims.Role == "ADMIN"` on `/subtitles/admin/*`.
- [x] **5.2 Video Player Subtitle Selection, Timestamp & Resource Name Consistency**:
  - Parse and activate subtitles immediately when clicking `"Select"` in `useSubtitleSearch.ts` (`handleSelectSubtitleFromSearch`).
  - Fix the inverted `else if (sessionStorage.getItem('videoCurrentTime'))` condition in `useVideoUpload.ts` so new videos do not jump to the previous video's timestamp.
  - Unify `yt:<videoId>` resource naming in `VideoPlayer.tsx` and `useVideoSubtitles.ts` so saved words highlight properly in YouTube videos.
- [ ] **5.3 Video Playback Persistence & Watch History Progress**:
  - Store `currentTime` in `useRecentVideos.ts`, restore `videoUrl` on `/videos` across page refreshes, and pass saved `currentTime` when resuming from Dashboard or Recent Videos.
- [x] **5.4 Books Reader Progress, Completion & Word Click Lookup**:
  - Save reading progress in `BookReaderPage.tsx` on chapter load (`useEffect`) so Chapter 1 and single-chapter books appear in `"Continue Reading"`, and only mark a book `isCompleted: true` when explicitly finishing the final chapter (not upon entering it).
  - Support clicking individual words to translate in `BookContent.tsx` and multi-word phrase highlighting.
- [x] **5.5 Spotify Integration, Student Lesson Save & Onboarding/Dashboard Fixes**:
  - Align `EnhancedSongSearchService.ts` with backend `GET /api/music/search?q=...` and flat `MusicTrackDto`, track token expiry in `spotify.go`, and remove hardcoded client secret from `SpotifyService.ts`.
  - Fix `StudentLessonPage.tsx` `catch` block so failed saves do not mark words as `"Saved"`.
  - Derive `isOnboardingMode` from `?onboarding=true` in `useVideoOnboarding.ts` so demo subtitles are unblurred during onboarding.
  - Track `statsError` in `useDashboardData.ts` / `dashboardUtils.ts` so transient API errors do not set `isNewUser = true` or hijack `/dictionary` and `/learning` links.

