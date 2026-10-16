# Spec 51: Subtitle Video Performance Optimization (Redis Caching, Edge Compression & Frontend Cache)

- **Status**: Completed
- **Owner**: Performance & Backend Architecture
- **Related ADR**: ADR-121
- **Depends On**: Spec 50 (`50_cls_performance_and_seo_optimization.md`)

---

## 1. Problem Statement & Scope

A severe performance issue was observed where loading video subtitles took 14,703 ms (`[Performance] GET /api/subtitles/video/Raya.and.the.Last.Dragon.2021.srt took 14703ms`).

Investigation identified three systemic bottlenecks:
1. **Uncached PostgreSQL Queries in Media Service**:
   - `GetSubtitlesForVideo(ctx, userID, name)` executes a raw database query (`SELECT id, user_id, name, start_time_ms, end_time_ms, text FROM subtitle WHERE user_id = $1 AND name = $2 ORDER BY start_time_ms`) every time a video subtitle is requested.
   - For a full feature film, ~2,000 distinct rows are scanned sequentially, allocated into structs, and JSON-serialized without Redis caching.
2. **Uncompressed API Payloads at the Edge**:
   - In `Caddyfile`, `encode gzip zstd` was only declared inside the SPA static file handler block (`handle {`), omitting `handle /api*`.
   - As a result, massive JSON payloads (~350–500 KB for 2,000 subtitle entries) were transferred over the network without compression.
3. **Redundant Network Calls on Frontend Mount**:
   - In `VideoPlayer.tsx`, whenever the player mounted with `storedSubtitleName`, `handleSubtitleClick` always executed `SubtitleService.fetchSubtitlesForVideo(subtitleName)` even if the parsed subtitle payload was already present in `sessionStorage.getItem('videoSubtitles')`.

This specification implements Redis caching for `GetSubtitlesForVideo` with automatic invalidation, enables edge Gzip/Zstandard compression on `/api*`, and adds a fast-path cache retrieval in `VideoPlayer.tsx`.

---

## 2. Technical Requirements

1. **Redis Caching in `media-service` (`subtitle_service.go`)**:
   - Cache key format: `subtitles:video:{userID}:{name}`.
   - TTL: 24 hours (`24 * time.Hour`).
   - On `GetSubtitlesForVideo`:
     - If `s.redis != nil`: check key in Redis. If found, unmarshal JSON and return immediately (<2ms).
     - On cache miss: query `s.repo.FindByUserIdAndNameOrderByStartTimeMs`, serialize to JSON, write to Redis with 24h TTL, and return.
   - Cache Invalidation:
     - On `UploadSubtitles`: invalidate `subtitles:{userID}` and `subtitles:video:{userID}:{fileName}`.
     - On `DeleteByUserIdAndName`: invalidate `subtitles:{userID}` and `subtitles:video:{userID}:{name}`.

2. **Edge Compression in `Caddyfile`**:
   - Add `encode gzip zstd` inside `handle /api*` block to compress all JSON responses from `gateway:8080`.

3. **Frontend Fast-Path Cache in `VideoPlayer.tsx`**:
   - In `handleSubtitleClick(subtitleName)`:
     - If `sessionStorage.getItem('subtitleName') === subtitleName` and `sessionStorage.getItem('videoSubtitles')` contains valid JSON array data matching this subtitle, reuse cached subtitles directly instead of making a duplicate network request.
     - Always update state and sessionStorage consistently.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/51_subtitle_video_performance_optimization.md`
- `context/progress_tracker.md`
- `substreamedu-media-service-go/internal/service/subtitle_service.go`
- `substreamedu-media-service-go/internal/service/subtitle_service_test.go`
- `Caddyfile`
- `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx`

---

## 4. Verification Checklist

1. `go test -v ./...` in `substreamedu-media-service-go` passes cleanly with new unit tests.
2. `npm test -- src/components/VideoPage --watchAll=false` in `substreamedu-frontend` passes.
3. `npx tsc --noEmit` in `substreamedu-frontend` produces 0 errors.
