#!/bin/bash

echo "=== Rebuilding notification-service ==="
cd /c/Users/zyoneal/Desktop/substreamedu-go

# Rebuild and restart the notification service
docker compose up -d --build notification-service

echo ""
echo "=== Waiting 5 seconds for service to start ==="
sleep 5

echo ""
echo "=== Checking service logs ==="
docker logs notification-service --tail 50

echo ""
echo "=== Service status ==="
docker ps | grep notification-service
