# SubStreamEdu: Expected System Load & Capacity Specifications

## 1. System Scale & Target Capacity

This specification defines the baseline operational parameters, user capacity, request volumes, and latency budgets for the SubStreamEdu platform. All architectural decisions, database index designs, and service boundaries must be validated against these load assumptions.

| Dimension | Target Capacity | Notes |
| :--- | :--- | :--- |
| **Total Registered Users** | 10,000 | Active account records in `sse_iam` |
| **Daily Active Learners (DAU)** | 1,500 | Users completing at least 1 study session/day |
| **Peak Concurrent Users (CCU)** | 300 – 500 | Simultaneous interactive video stream / flashcard sessions |
| **Educator / Teacher Accounts** | 50 | Creating worksheets and managing student cohorts |
| **Students per Educator Cohort** | Up to 100 | Accessing public lesson worksheets concurrently |

---

## 2. Data Volume & Storage Footprint

### 2.1 Vocabulary & Flashcards (`substreamedu_dictionary`)
- **Cards per Learner**:
  - Median learner: 800 active cards (400 recognition + 400 production).
  - Power learner (upper 5%): up to 5,000 cards.
- **Total Card Population**: ~5,000,000 cards across all users.
- **Daily Review Activity**:
  - Reviews per DAU: 40 – 70 cards/day.
  - Daily review logs generated: 60,000 – 105,000 rows/day in `review_log`.
  - Retention policy: `review_log` partitioned or indexed by `(user_id, reviewed_at DESC)`.
- **Database Sizing**:
  - PostgreSQL row size: ~450 bytes per card, ~120 bytes per review log.
  - Projected annual table size: ~2.5 GB cards + ~4.5 GB review history (excluding indexes).

### 2.2 Subtitles & Media Metadata (`substreamedu_media`)
- **Indexed Video Titles**: ~5,000 films, series episodes, and YouTube educational clips.
- **Subtitle Cue Density**: Average 1,200 – 1,800 dialogue cues per film (80 – 150 KB raw text).
- **In-Memory Subtitle Cache**: Hot subtitle cues cached in Redis with a 24-hour sliding TTL (~150 MB Redis footprint).

### 2.3 Lessons & Worksheets
- **Active Interactive Lessons**: ~2,500 lesson plans in `lessons` table.
- **Worksheet Payload**: ~15 KB JSON per lesson (CEFR vocab list, 5-question comprehension quiz, 5 gap-fill exercises).

---

## 3. Traffic Profile & Latency SLAs

### 3.1 HTTP Ingress & Microservice Request Rates

| Endpoint / Subsystem | Peak RPS | p95 Latency SLA | p99 Latency SLA | Caching Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Gateway Ingress (Caddy + Go)** | 800 – 1,200 | < 15ms | < 45ms | Static assets served from Caddy disk cache |
| **Auth & Profile (`iam-service`)** | 40 – 60 | < 20ms | < 60ms | Public key / token blacklist cached in Redis |
| **SRS Daily Cards (`/srs/today`)** | 80 – 120 | < 30ms | < 80ms | Bounded query with indexed user due cutoff |
| **SRS Stats (`/srs/stats`)** | 100 – 150 | < 5ms (cached) | < 25ms | Transparent Redis cache (`srs:stats:{userID}:{loc}`, TTL: 2m) |
| **Flashcard Review Mutation (`/review`)** | 50 – 80 | < 35ms | < 90ms | Transactional Outbox + Redis cache invalidation |
| **Save Word Mutation (`/save-word`)** | 30 – 50 | < 40ms | < 100ms | Dual-card insert in single DB transaction |
| **AI Translation / Enrichment** | 25 – 40 | < 1,500ms | < 3,500ms | Cache key `ai:translation:v3.3` (TTL: 30 days) |
| **Grammar Analysis (`/grammar/analyze`)**| 10 – 20 | < 1,200ms | < 3,000ms | Rule engine fallback in <5ms if LLM circuit opens |
| **Subtitle Search (`/subtitles/search`)**| 20 – 35 | < 80ms | < 250ms | SubDL external query cached in Redis (TTL: 6h) |
| **Reel / Clip Generator (`/youtube/clip`)**| 3 – 5 | < 4,000ms | < 8,000ms | Disk cache in `/var/www/shared_media/clips/` |

---

## 4. Resource Allocation & Container Bounds

Every container in `docker-compose.yml` and Kubernetes deployments must adhere to these resource bounds to prevent CPU starvation and out-of-memory (OOM) kills:

```yaml
# Recommended Container Resource Allocation
services:
  caddy:
    cpus: '0.50'
    memory: 256M

  substreamedu-gateway-go:
    cpus: '1.00'
    memory: 256M

  substreamedu-iam-service-go:
    cpus: '0.50'
    memory: 256M

  substreamedu-dictionary-service-go:
    cpus: '1.50'
    memory: 512M

  substreamedu-media-service-go:
    cpus: '1.00'
    memory: 512M

  substreamedu-notification-service-go:
    cpus: '0.50'
    memory: 256M

  postgres:
    cpus: '2.00'
    memory: 2048M
    # shared_buffers = 512MB, effective_cache_size = 1536MB

  redis:
    cpus: '0.75'
    memory: 512M
    # maxmemory 400mb, maxmemory-policy volatile-lru

  kafka:
    cpus: '1.00'
    memory: 1024M
```

---

## 5. Architectural Guardrails Under Load

1. **Connection Pooling Hard Limits**:
   - Each Go microservice configures `pgxpool.Config.MaxConns = 25` and `MinConns = 5`.
   - Max total database connections across all 5 services: `5 * 25 = 125` (well within PostgreSQL default `max_connections = 150`).
2. **Circuit Breakers on External AI & Subtitle APIs**:
   - LLM translation requests execute under a strict `4.5s` context timeout.
   - If error rate exceeds 30% over a 1-minute window, circuit breaker opens and serves deterministic algorithmic / local dictionary fallbacks.
3. **Outbox Message Queueing**:
   - `WordReviewedEvent` and `StreakUpdatedEvent` must never block HTTP responses. Events are committed into `outbox_events` in the same transaction as the card update, and dispatched by a background worker polling every 250–500ms.
4. **Zero Unbounded Background Work**:
   - YouTube video processing and mass Anki export jobs must run in bounded worker pools (max 3 concurrent jobs) to protect host CPU and network bandwidth.
