# syntax=docker/dockerfile:1.4
FROM --platform=$BUILDPLATFORM golang:bookworm AS builder

ENV CGO_ENABLED=1 \
    GO111MODULE=on \
    GOTOOLCHAIN=auto

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates build-essential && \
    rm -rf /var/lib/apt/lists/*

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
    -ldflags="-s -w \
              -X 'main.GitCommit=${GIT_COMMIT}' \
              -X 'main.BuildTime=${BUILD_TIME}'" \
    -o /out/server \
    ./cmd/server

RUN echo 'package main; import ("net/http"; "os"); func main() { url := "http://127.0.0.1:3003/dictionary-service/actuator/health"; if len(os.Args) > 1 { url = os.Args[1] }; resp, err := http.Get(url); if err != nil || resp.StatusCode != 200 { os.Exit(1) } }' > /build/healthcheck.go && \
    CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build \
    -trimpath -ldflags="-s -w -extldflags '-static'" \
    -o /out/healthcheck /build/healthcheck.go

FROM gcr.io/distroless/base-debian12:nonroot AS runtime

LABEL org.opencontainers.image.title="substreamedu-dictionary-service" \
      org.opencontainers.image.description="SubStreamEdu Dictionary & SRS Vocabulary Service" \
      org.opencontainers.image.vendor="SubStreamEdu" \
      org.opencontainers.image.source="https://github.com/zyoneal/substreamedu-go"

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /out/server /app/server
COPY --from=builder --chown=nonroot:nonroot /out/healthcheck /app/healthcheck

USER nonroot:nonroot

EXPOSE 3003

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/app/healthcheck", "http://127.0.0.1:3003/dictionary-service/actuator/health"]

STOPSIGNAL SIGTERM

ENTRYPOINT ["/app/server"]
