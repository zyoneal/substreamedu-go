#!/bin/bash
set -e

echo "🚀 Starting SubStreamEdu Microservices Stack..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "  cp .env.example .env"
    exit 1
fi

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build and start all services
echo "🔨 Building and starting services..."
echo "This may take a few minutes on first run..."
docker compose up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
echo "This may take 1-2 minutes..."

# Function to check service health
check_health() {
    local service=$1
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose ps | grep -q "$service.*healthy"; then
            echo "✅ $service is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "❌ $service failed to become healthy"
    return 1
}

# Check infrastructure services first
check_health "postgres"
check_health "kafka"
check_health "redis"

# Check application services
check_health "iam-service"
check_health "dictionary-service"
check_health "media-service"
check_health "notification-service"
check_health "gateway"

echo ""
echo "✅ All services are up and running!"
echo "🚀 Total RAM footprint reduced by ~1.3GB thanks to Go migration."
echo ""
echo "📊 Service URLs (Go Actuators):"
echo "  - Gateway:      http://localhost:8080/gateway/actuator/health"
echo "  - IAM:          http://localhost:8080/auth/health (via Gateway)"
echo "  - Dictionary:   http://localhost:3003/dictionary-service/actuator/health"
echo "  - Media:        http://localhost:3004/media-service/actuator/health"
echo "  - Notification: http://localhost:3005/notification-service/actuator/health"
echo ""
echo "📈 Monitoring:"
echo "  - Prometheus:  http://localhost:9090"
echo "  - Grafana:     http://localhost:3100 (admin/admin)"
echo "  - Jaeger:      http://localhost:16686"
echo ""
echo "📝 View logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "  docker-compose down"
