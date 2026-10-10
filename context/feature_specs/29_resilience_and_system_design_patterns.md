# Spec 29: Resilience and System Design Patterns (ADR-099)

> **Status**: Completed  
> **Author**: Senior Software Engineer & System Architect  
> **Date**: 2026-10-10  
> **Phase**: Phase 2: Product Feature Expansion  

---

## 1. Problem Statement & Motivation
Following the comprehensive system audit of the SubStreamEdu distributed backend (Gateway, IAM, Dictionary, Media, Notification services), critical reliability risks and anti-patterns were uncovered:
1. **Unbounded / Excessive Timeouts**: LLM requests configured with 45s–60s timeouts (violating the 4.5s SLA and risking thread starvation); SMTP dialer lacking TCP/TLS timeouts; ad-hoc `http.Client` allocations creating socket leaks.
2. **Thundering Herd & Blind Retries**: Deterministic exponential backoff without jitter (`2^(attempt-1) * 2s`) in Telegram daily reviews; linear sleep in Outbox worker; lack of retries on transient network flips.
3. **Missing Circuit Breakers & Fallbacks**: Gateway circuit breaker using naive counter without sliding window; internal inter-service calls (IAM, Dictionary) and external APIs (Spotify, SubDL, DictionaryAPI) lacking circuit breakers.
4. **Lack of Bulkhead Isolation**: Telegram bot spawning unbounded goroutines for all active users at once; single-threaded Outbox processor experiencing Head-of-Line blocking.
5. **Missing Idempotency**: Mutating endpoints (`/translated`, `/review2`, `/usage/increment`) lacking `Idempotency-Key` validation, causing duplicate card creation and duplicate FSRS intervals on retries.
6. **Swallowed Poison Pills & Missing DLQ**: Corrupted or unparseable Kafka messages committed and lost without routing to a Dead Letter Queue (DLQ); failed Outbox events looping indefinitely in `PENDING` state.

---

## 2. Architecture & Pattern Specifications

### 2.1 Core Resilience Package (`internal/resilience`)
A unified, zero-dependency/clean-architecture package shared across Go services providing:
1. **`resilience.Backoff`**:
   - Implements AWS Full Jitter: $\text{Sleep} = \text{rand}(0, \min(M, B \times 2^{\text{attempt}}))$.
   - Configurable base delay $B$, max delay $M$, max attempts, and retryable error classification.
2. **`resilience.CircuitBreaker`**:
   - States: `StateClosed`, `StateOpen`, `StateHalfOpen`.
   - Sliding window count, failure rate threshold (e.g. 50%), open cooldown timeout, and half-open success threshold.
   - Fast fallback execution without calling degraded downstreams.
3. **`resilience.Client`**:
   - Standardized `http.Client` and `http.Transport` factory with idle connection management, dial timeouts, and context enforcement.

### 2.2 Idempotency Engine
- Extraction of `Idempotency-Key` header (UUID) on mutating routes.
- Redis / PostgreSQL atomic tracking (`SETNX` / `idempotency_keys` table with 24h TTL).
- Concurrent execution guard (returns HTTP 409 Conflict if in flight, or cached response if already completed).

### 2.3 Bulkhead & Bounded Worker Pools
- Bounded concurrency semaphores (`chan struct{}`) for Telegram batch notifications, preventing Telegram API 429s.
- Concurrency bounding for APKG media exports and asynchronous tasks.

### 2.4 Dead Letter Queue (DLQ)
- Unrecoverable errors (JSON schema failure, poison pills) routed to DLQ topic with metadata headers (`x-original-topic`, `x-error-reason`, `x-retry-count`, `x-failed-at`).
- Outbox processor transitions permanently failed items from `PENDING` to `DEAD_LETTER` after max attempts, recording error reason.

---

## 3. Implementation Rules & File Boundaries
1. Files to create/modify must stay within the 300-line limit for Go source files ([code_standards.md](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md)).
2. Tests must be deterministic and run in under 5 seconds with zero race conditions (`-race`).
3. Each phase must be verified with `go test ./...` before proceeding.

---

## 4. Verification Checklist
- [x] Unit tests for Exponential Backoff with Full Jitter.
- [x] Unit tests for Circuit Breaker state transitions (Closed -> Open -> Half-Open -> Closed).
- [x] Unit tests for Idempotency deduplication middleware.
- [x] Unit tests for Bulkhead worker pool concurrency capping.
- [x] Unit tests for Kafka DLQ routing on malformed payloads.
- [x] Full local CI pass: `go test -v ./...` in all 5 microservices.
