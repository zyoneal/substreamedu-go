#!/bin/bash
set -eo pipefail

PROJECT_DIR="${PROJECT_DIR:-/app}"

echo "========================================="
echo "🚀 Starting Automated Enterprise CD Rollout"
echo "Time: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "========================================="

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
elif [ -d "$HOME/substreamedu-go" ]; then
    cd "$HOME/substreamedu-go"
else
    echo "⚠️ Warning: Target directory not found, using current directory: $(pwd)"
fi

# Concurrency Mutex Lock (Self-Healing Host Mutex)
exec 200>/tmp/substreamedu_deploy.lock
if ! flock -n 200; then
    echo "⚠️ Another deployment holds /tmp/substreamedu_deploy.lock. Checking active processes..."
    CURRENT_PID=$$
    PARENT_PID=$PPID
    LOCK_PIDS=$(fuser /tmp/substreamedu_deploy.lock 2>/dev/null | tr -s ' ' '\n' | grep -vE "^(${CURRENT_PID}|${PARENT_PID})$" | tr '\n' ' ' || true)
    if [ -n "$LOCK_PIDS" ]; then
        echo "⏳ Active deployment processes detected [$LOCK_PIDS]. Waiting up to 120s for graceful completion..."
        if ! flock -w 120 200; then
            echo "⚠️ Timeout waiting for previous run. Terminating stale deployment processes: $LOCK_PIDS"
            kill -15 $LOCK_PIDS 2>/dev/null || true
            sleep 3
            kill -9 $LOCK_PIDS 2>/dev/null || true
            flock -w 30 200 || { echo "❌ Failed to acquire deployment lock after terminating stale processes."; exit 1; }
        fi
    else
        flock -w 60 200 || { echo "❌ Could not acquire deployment lock after 60s."; exit 1; }
    fi
fi
echo "✅ Acquired deployment mutex lock."

# Step 1: Synchronize Git Repository
PREV_COMMIT=""
CHANGED_FILES=""
if [ -d ".git" ]; then
    # Clean up stale locks in case an earlier session was aborted
    rm -f .git/index.lock .git/refs/remotes/origin/main.lock .git/refs/heads/main.lock .git/shallow.lock 2>/dev/null || true

    PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || true)
    echo "📦 Pulling latest code changes from origin/main..."
    git fetch --prune --force origin main
    git reset --hard origin/main
    NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || true)

    if [ -n "$PREV_COMMIT" ] && [ -n "$NEW_COMMIT" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
        CHANGED_FILES=$(git diff --name-only "$PREV_COMMIT" "$NEW_COMMIT" 2>/dev/null || true)
    elif [ -f ".git/ORIG_HEAD" ]; then
        ORIG_COMMIT=$(cat .git/ORIG_HEAD 2>/dev/null || true)
        if [ -n "$ORIG_COMMIT" ] && [ "$ORIG_COMMIT" != "$NEW_COMMIT" ]; then
            CHANGED_FILES=$(git diff --name-only "$ORIG_COMMIT" "$NEW_COMMIT" 2>/dev/null || true)
        fi
    fi

    if [ -n "$CHANGED_FILES" ]; then
        echo "📝 Changed files in this deployment:"
        echo "$CHANGED_FILES"
    fi
fi

# Step 2: Attempt Registry Image Pull (Pre-Built Immutable Artifacts)
echo "🐳 Attempting to pull pre-built immutable container images from registry..."
docker compose pull --ignore-pull-failures || true

# Step 3: Fast Incremental Build (Fallback if not pulling from registry)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

SERVICES_TO_BUILD=()
if [ -z "$CHANGED_FILES" ] || echo "$CHANGED_FILES" | grep -qE "(docker-compose|deploy\.sh|\.env)"; then
    echo "⚡ Configuration changes detected: selective verification..."
    SERVICES_TO_BUILD=("iam-service" "dictionary-service" "media-service" "notification-service" "gateway" "frontend")
else
    echo "$CHANGED_FILES" | grep -q "^substreamedu-iam-service-go" && SERVICES_TO_BUILD+=("iam-service")
    echo "$CHANGED_FILES" | grep -q "^substreamedu-dictionary-service-go" && SERVICES_TO_BUILD+=("dictionary-service")
    echo "$CHANGED_FILES" | grep -q "^substreamedu-media-service-go" && SERVICES_TO_BUILD+=("media-service")
    echo "$CHANGED_FILES" | grep -q "^substreamedu-notification-service-go" && SERVICES_TO_BUILD+=("notification-service")
    echo "$CHANGED_FILES" | grep -q "^substreamedu-gateway-go" && SERVICES_TO_BUILD+=("gateway")
    echo "$CHANGED_FILES" | grep -q "^substreamedu-frontend" && SERVICES_TO_BUILD+=("frontend")
fi

if [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
    echo "🔨 Building changed services with BuildKit caching: ${SERVICES_TO_BUILD[*]}..."
    for svc in "${SERVICES_TO_BUILD[@]}"; do
        echo "Building $svc..."
        docker compose build "$svc"
    done
else
    echo "⚡ No service code changes detected. Skipping container builds."
fi

# Step 3.5: Pre-Deployment Database Backup
echo "💾 Creating pre-deployment database backup..."
mkdir -p ./backups
docker compose exec -T postgres pg_dump -U postgres -Fc sse_iam > "./backups/iam_$(date +%Y%m%d_%H%M%S).dump" 2>/dev/null || true
docker compose exec -T postgres pg_dump -U postgres -Fc substreamedu_dictionary > "./backups/dict_$(date +%Y%m%d_%H%M%S).dump" 2>/dev/null || true
docker compose exec -T postgres pg_dump -U postgres -Fc substreamedu_media > "./backups/media_$(date +%Y%m%d_%H%M%S).dump" 2>/dev/null || true
# Keep only the latest 15 dumps
ls -t ./backups/*.dump 2>/dev/null | tail -n +16 | xargs -r rm -f 2>/dev/null || true

# Step 4: Zero-Downtime Rolling Update
echo "🚀 Applying rolling updates to containers..."
docker compose up -d --remove-orphans

echo "🔄 Reloading Caddy configuration (zero-downtime TLS & reverse-proxy reload)..."
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>/dev/null || docker compose restart caddy || true

# Step 5: Enterprise Health Check Verification Loop
echo "⏳ Verifying service health status..."
CHECK_SERVICES=("postgres" "redis" "iam-service" "dictionary-service" "media-service" "notification-service" "gateway")

ALL_HEALTHY=true
FAILED_SERVICES=()

for svc in "${CHECK_SERVICES[@]}"; do
    echo -n "Checking health of service '$svc' ... "
    IS_HEALTHY=false
    STATUS="unknown"
    CID=""

    for attempt in $(seq 1 35); do
        # Resolve container ID dynamically from Docker Compose service or fallback to container name
        CID=$(docker compose ps -q "$svc" 2>/dev/null | head -n 1 || true)
        if [ -z "$CID" ]; then
            CID=$(docker inspect --format='{{.Id}}' "$svc" 2>/dev/null || docker inspect --format='{{.Id}}' "substreamedu-$svc" 2>/dev/null || echo "")
        fi

        if [ -n "$CID" ]; then
            STATUS=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CID" 2>/dev/null || echo "not_found")
        else
            STATUS="not_found"
        fi

        if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
            IS_HEALTHY=true
            break
        fi
        sleep 2
    done

    if [ "$IS_HEALTHY" = true ]; then
        echo "✅ OK ($STATUS)"
    else
        echo "❌ FAILED ($STATUS)"
        FAILED_SERVICES+=("$svc (status: $STATUS)")
        ALL_HEALTHY=false

        if [ -n "$CID" ]; then
            echo "--- Health Status for '$svc' ($CID) ---"
            docker inspect --format='Health Status: {{if .State.Health}}{{.State.Health.Status}}{{else}}None{{end}} | ExitCode: {{.State.ExitCode}} | Error: {{.State.Error}}' "$CID" 2>/dev/null || true
            echo "--- Recent Health Logs ---"
            docker inspect --format='{{range .State.Health.Log}}[{{.Start}}] Exit: {{.ExitCode}} Output: {{.Output}}{{end}}' "$CID" 2>/dev/null || true
            echo "--- Recent Container Logs (tail 40) ---"
            docker logs --tail 40 "$CID" 2>&1 || true
            echo "-------------------------------------------------"
        fi
    fi
done

# Step 6: Edge End-to-End Verification
echo -n "Testing Public Gateway Edge (https://substreamedu.com/api/health) ... "
if curl -sf --max-time 10 https://substreamedu.com/api/gateway/actuator/health >/dev/null 2>&1 || curl -sf --max-time 10 https://substreamedu.com/api/health >/dev/null 2>&1 || curl -sf --max-time 10 -k https://127.0.0.1/api/health >/dev/null 2>&1; then
    echo "✅ Edge Gateway Online"
else
    echo "⚠️ Edge Gateway check returned non-200 (continuing internal verification)"
fi

# Step 7: Clean Up Dangling Layers & BuildKit Cache
echo "🧹 Pruning BuildKit cache (keeping last 2GB)..."
docker builder prune -f --keep-storage 2GB || true

echo "🧹 Pruning untagged build cache..."
docker image prune -f || true

if [ "$ALL_HEALTHY" = true ]; then
    echo "========================================="
    echo "🎉 Enterprise Deployment Rollout Successful!"
    echo "========================================="
    exit 0
else
    echo "========================================="
    echo "❌ Deployment Rollout FAILED: Health Verification Error"
    echo "Failed service(s):"
    for failed_svc in "${FAILED_SERVICES[@]}"; do
        echo "   • $failed_svc"
    done
    echo "Inspect logs: docker compose logs --tail=100"
    echo "========================================="
    exit 1
fi

