# Feature Spec 03: Asynchronous Task Offloading & Performance Optimization

## 1. Goal
Eliminate synchronous latency bottlenecks and potential memory denial-of-service by offloading heavy operations (LLM text generation, large Anki `.apkg` and CSV exports, unmonitored embedding backfills, and large subtitle uploads) to bounded background workers with cancellation context and streaming responses.

---

## 2. Design & Architectural Decisions

1. **Controlled Background Worker Pool**:
   - Replace unbounded `go func() { ... }()` in `BackfillMissingEmbeddings` with a structured, rate-limited worker pool.
   - Bind background worker executions to a cancellable root context with graceful shutdown handling on `SIGTERM`.
2. **Asynchronous / Streamed AI Generation**:
   - For long-running AI generation endpoints (`/subtitles/generate-text`, `/generate-cohesive`, `/generate-questions`, `/session-summary`):
     - Support Server-Sent Events (SSE) or chunked HTTP streaming where appropriate for interactive UI responses.
     - Add explicit client-side and server-side request timeouts (`15s` max) with graceful fallback messages instead of hanging connections.
3. **Optimized Large Export Processing**:
   - For Anki `.apkg` and CSV exports:
     - Implement streaming zip/CSV writer rather than loading all database rows into a single in-memory byte slice.
     - Enforce a maximum batch size limit per export request to protect server RAM.
4. **Streaming Subtitle Ingestion**:
   - In `media-service/internal/handler/media_handler.go`, replace `f.Read(buf)` with a streamed `io.LimitReader` (max 5MB) directly into parser pipelines, preventing large file memory allocations.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go` (stream exports, replace raw goroutines).
- `substreamedu-dictionary-service-go/internal/service/ai_service.go` (enforce timeouts, implement streaming).
- `substreamedu-media-service-go/internal/handler/media_handler.go` (bounded streaming reader for subtitle uploads).
- `substreamedu-media-service-go/internal/service/subtitle_service.go`.

### What NOT to Touch:
- Do NOT alter the FSRS scheduling formulas or parameters.
- Do NOT modify database tables.
- Do NOT change existing Anki SQLite table structure inside generated `.apkg` packages.

---

## 4. Verification Checklist
- [ ] No unmonitored `go func()` exists in `substreamedu-dictionary-service-go` or `substreamedu-media-service-go`.
- [ ] Subtitle uploads with files exceeding 5MB are rejected early with `413 Payload Too Large`.
- [ ] Subtitle uploads under 5MB process cleanly via streaming without allocating unbounded byte slices.
- [ ] AI generation requests time out cleanly after 15s with a structured error payload if upstream LLMs stall.
- [ ] Exporting a 2,000-word dictionary to Anki `.apkg` completes without memory spikes over 50MB.
- [ ] Unit and benchmark tests confirm zero goroutine leaks under simulated load.
