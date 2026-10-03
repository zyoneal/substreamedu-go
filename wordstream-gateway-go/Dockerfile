# Build stage
FROM golang:1.23-alpine AS build

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /gateway \
    ./cmd/gateway

# Runtime stage
FROM alpine:3.19

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

RUN apk add --no-cache ca-certificates wget

WORKDIR /app

COPY --from=build /gateway /app/gateway

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/gateway/actuator/health || exit 1

ENTRYPOINT ["/app/gateway"]
