#!/bin/bash
# Script to restart zero-cache with a cleared cache
# This is useful after schema changes like adding primary keys

set -e

# Resolve paths relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Restarting Zero Cache with Cleared Cache"
echo "=========================================="
echo ""

# Stop zero-cache
echo "Step 1: Stopping zero-cache service..."
docker-compose stop zero-cache-local

# Remove the volume to clear the cache
echo "Step 2: Clearing zero-cache data volume..."
docker-compose rm -f zero-cache-local 2>/dev/null || true
docker volume rm zero-cache-local-data 2>/dev/null || true

# Start zero-cache again (volume will be recreated automatically)
echo "Step 3: Starting zero-cache service with fresh cache..."
docker-compose up -d zero-cache-local

echo ""
echo "=========================================="
echo "Zero cache restarted with cleared cache"
echo ""
echo "View logs: docker-compose logs -f zero-cache-local"
echo "=========================================="

