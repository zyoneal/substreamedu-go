# Build stage
FROM golang:1.23-alpine AS build

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod ./
RUN rm -f go.sum

COPY . .

RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /server \
    ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

RUN apk add --no-cache ca-certificates wget python3 py3-pip ffmpeg nodejs && \
    pip3 install --no-cache-dir -U yt-dlp --break-system-packages

WORKDIR /app

COPY --from=build /server /app/server

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3004

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3004/media-service/actuator/health || exit 1

ENTRYPOINT ["/app/server"]
