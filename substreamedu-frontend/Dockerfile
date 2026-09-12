# syntax=docker/dockerfile:1.4
FROM --platform=$BUILDPLATFORM node:18-alpine AS builder

WORKDIR /app

ENV SKIP_PRE_RENDER=true \
    GENERATE_SOURCEMAP=false

ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_GOOGLE_API_KEY
ARG REACT_APP_API_URL=/api

ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID \
    REACT_APP_GOOGLE_API_KEY=$REACT_APP_GOOGLE_API_KEY \
    REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

COPY . .

RUN npm run build

FROM alpine:3.20 AS runtime

LABEL org.opencontainers.image.title="substreamedu-frontend" \
      org.opencontainers.image.description="SubStreamEdu Web Client Application" \
      org.opencontainers.image.vendor="SubStreamEdu" \
      org.opencontainers.image.source="https://github.com/zyoneal/substreamedu-go"

WORKDIR /app

COPY --from=builder /app/build /app/build

RUN echo '#!/bin/sh' > /app/deploy-assets.sh && \
    echo 'set -e' >> /app/deploy-assets.sh && \
    echo 'RELEASE_DIR="/var/www/frontend/releases/$(date +%s)"' >> /app/deploy-assets.sh && \
    echo 'mkdir -p "$RELEASE_DIR"' >> /app/deploy-assets.sh && \
    echo 'cp -a /app/build/. "$RELEASE_DIR/"' >> /app/deploy-assets.sh && \
    echo 'ln -sfn "$RELEASE_DIR" /var/www/frontend/current' >> /app/deploy-assets.sh && \
    echo 'echo "Frontend assets deployed to $RELEASE_DIR"' >> /app/deploy-assets.sh && \
    echo 'ls -dt /var/www/frontend/releases/* 2>/dev/null | tail -n +4 | xargs -r rm -rf' >> /app/deploy-assets.sh && \
    chmod +x /app/deploy-assets.sh

CMD ["/app/deploy-assets.sh"]
