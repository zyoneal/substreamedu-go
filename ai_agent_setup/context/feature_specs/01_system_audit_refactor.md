# Feature Spec 01: System Audit & Core Stability Refactor

## 1. Goal
Unify database migrations across all Go microservices using `golang-migrate`, add critical performance indexes for transactional outbox polling, configure Caddy log rotation volumes, resolve the Loki/Promtail logging pipeline, and automate pre-deployment database backups in `deploy.sh`.

---

## 2. Design & Architectural Decisions
1. **Unified Migration Standard**:
   - Standardize `substreamedu-dictionary-service-go`, `substreamedu-media-service-go`, and `substreamedu-notification-service-go` on `golang-migrate/migrate/v4` (using `//go:embed migrations/*.sql`), identical to `substreamedu-iam-service-go`.
   - Remove runtime `ALTER TABLE` in `InitSchema()` from `dictionary-service`.
   - Ensure each service maintains its own versioned `schema_migrations` table in its respective database.
2. **Transactional Outbox Index**:
   - Add composite index on `outbox_events(status, created_at)` to eliminate sequential table scans during background worker polling.
3. **Log Hygiene & Rotation**:
   - Configure Caddy log rolling (`roll_size 20MiB`, `roll_keep 5`, `roll_keep_for 14d`) and mount `/var/log/caddy` to a persistent Docker volume to prevent container root filesystem bloat.
   - Resolve Loki/Promtail config: either deploy Promtail container with `/var/run/docker.sock` to feed container logs to Loki, or disable unused Loki container to reclaim ~50MiB RAM.
4. **Pre-Deployment Database Backup**:
   - Add automated `pg_dump` snapshot generation into `backups/` inside `deploy.sh` prior to applying container upgrades or migrations, with automatic retention of the latest 5 backups.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-dictionary-service-go/internal/repository/migrations/` (create numbered `.up.sql` and `.down.sql` migrations).
- `substreamedu-dictionary-service-go/internal/repository/migrations.go` (switch to `golang-migrate`).
- `substreamedu-media-service-go/internal/repository/` (add migrations folder and `migrator.go`).
- `substreamedu-notification-service-go/internal/repository/` (switch to `golang-migrate`).
- `init-db/01-init.sh` (add `idx_outbox_events_status_created`).
- `Caddyfile` and `docker-compose.yml` (Caddy volume and log rotation).
- `deploy.sh` (pre-deployment database snapshot block).

### What NOT to Touch:
- Do NOT alter any API routes or request/response DTOs.
- Do NOT modify frontend code or React components.
- Do NOT alter existing table schemas or column names in `sse_user`, `dictionary`, or `subtitle`.

---

## 4. Verification Checklist
- [x] All Go microservices compile cleanly (`go build ./cmd/...`).
- [x] `golang-migrate` successfully runs on startup across all services without error.
- [x] `schema_migrations` table exists in `substreamedu_dictionary`, `substreamedu_media`, and `sse_iam`.
- [x] Index `idx_outbox_events_status_created` is verified in `init-db/01-init.sh` and migrations.
- [x] Caddy configured with log rotation to `./logs/caddy/access.log`.
- [x] `deploy.sh` configured with automated pre-deployment backup to `./backups/`.
