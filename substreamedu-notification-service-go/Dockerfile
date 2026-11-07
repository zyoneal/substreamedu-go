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

RUN echo 'package main; import ("net/http"; "os"); func main() { url := "http://127.0.0.1:3005/notification-service/actuator/health"; if len(os.Args) > 1 { url = os.Args[1] }; resp, err := http.Get(url); if err != nil || resp.StatusCode != 200 { os.Exit(1) } }' > /build/healthcheck.go && \
    GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build \
    -trimpath -ldflags="-s -w -extldflags '-static'" \
    -o /out/healthcheck /build/healthcheck.go

FROM gcr.io/distroless/static-debian12:nonroot AS runtime

LABEL org.opencontainers.image.title="substreamedu-notification-service" \
      org.opencontainers.image.description="SubStreamEdu Notification & Telegram Dispatcher" \
      org.opencontainers.image.vendor="SubStreamEdu" \
      org.opencontainers.image.source="https://github.com/zyoneal/substreamedu-go"

WORKDIR /app

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder --chown=nonroot:nonroot /out/server /app/server
COPY --from=builder --chown=nonroot:nonroot /out/healthcheck /app/healthcheck

USER nonroot:nonroot

EXPOSE 3005

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/app/healthcheck", "http://127.0.0.1:3005/notification-service/actuator/health"]

STOPSIGNAL SIGTERM

ENTRYPOINT ["/app/server"]
