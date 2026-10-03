# Build stage (using Debian for much faster CGO/SQLite compilation)
FROM golang:1.24.1-bookworm AS build

ENV GOTOOLCHAIN=auto
ENV CGO_ENABLED=1

WORKDIR /app

COPY go.mod go.sum* ./
COPY . .
RUN go mod tidy && go mod download

# Use BuildKit cache to speed up CGO compilation immensely
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /server \
    ./cmd/server

# Runtime stage (Debian-based for glibc compatibility)
FROM debian:bookworm-slim

RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/false appuser

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /server /app/server

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3003/dictionary-service/actuator/health || exit 1

ENTRYPOINT ["/app/server"]
