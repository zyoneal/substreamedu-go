# syntax=docker/dockerfile:1.4
FROM --platform=$BUILDPLATFORM golang:alpine AS builder

ENV CGO_ENABLED=0 \
    GO111MODULE=on \
    GOTOOLCHAIN=auto

WORKDIR /build

RUN apk add --no-cache ca-certificates git tzdata

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download -x

COPY . .

ARG TARGETOS
ARG TARGETARCH
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build \
    -mod=readonly \
    -trimpath \
    -ldflags="-s -w -extldflags '-static' \
              -X 'main.GitCommit=${GIT_COMMIT}' \
              -X 'main.BuildTime=${BUILD_TIME}'" \
    -o /out/server \
    ./cmd/server

RUN echo 'package main; import ("net/http"; "os"); func main() { url := "http://127.0.0.1:3004/media-service/actuator/health"; if len(os.Args) > 1 { url = os.Args[1] }; resp, err := http.Get(url); if err != nil || resp.StatusCode != 200 { os.Exit(1) } }' > /build/healthcheck.go && \
    GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build \
    -trimpath -ldflags="-s -w -extldflags '-static'" \
    -o /out/healthcheck /build/healthcheck.go

FROM alpine:3.20 AS runtime

LABEL org.opencontainers.image.title="substreamedu-media-service" \
      org.opencontainers.image.description="SubStreamEdu Media Processing & Transcoding Service" \
      org.opencontainers.image.vendor="SubStreamEdu" \
      org.opencontainers.image.source="https://github.com/zyoneal/substreamedu-go"

RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup -s /sbin/nologin

RUN apk add --no-cache \
        ca-certificates \
        tzdata \
        ffmpeg \
        python3 \
        py3-pip \
        nodejs && \
    python3 -m pip install --no-cache-dir -U --break-system-packages "yt-dlp>=2025.1.1" && \
    rm -rf /root/.cache

WORKDIR /app

RUN mkdir -p /app/temp /var/www/shared_media && \
    chown -R appuser:appgroup /app /var/www/shared_media

COPY --from=builder --chown=appuser:appgroup /out/server /app/server
COPY --from=builder --chown=appuser:appgroup /out/healthcheck /app/healthcheck

USER appuser:appgroup

EXPOSE 3004

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/app/healthcheck", "http://127.0.0.1:3004/media-service/actuator/health"]

STOPSIGNAL SIGTERM

ENTRYPOINT ["/app/server"]
