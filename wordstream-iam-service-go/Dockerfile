# Build stage
FROM golang:1.24-alpine AS build

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files first for better caching
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /server \
    ./cmd/server

# Runtime stage - minimal image
FROM alpine:3.19

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Install CA certificates for HTTPS
RUN apk add --no-cache ca-certificates wget

WORKDIR /app

# Copy binary from build stage
COPY --from=build /server /app/server

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/auth-service/actuator/health || exit 1

# Run binary
ENTRYPOINT ["/app/server"]
