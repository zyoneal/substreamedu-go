#!/bin/bash

# FAANG-style granular rebuild for frontend
echo "=== Rebuilding substreamedu-frontend ==="
cd "$(dirname "$0")"

# Rebuild and restart only the frontend service
docker compose up -d --build frontend

echo ""
echo "=== Frontend status ==="
docker ps | grep substreamedu-frontend
