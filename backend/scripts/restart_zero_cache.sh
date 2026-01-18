#!/bin/bash
# Script to restart zero-cache with a cleared cache
# This is useful after schema changes like adding primary keys

set -e

# Find project root by searching upward for docker-compose.yml
# This allows the script to work from any directory within the project
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_DIR="$SCRIPT_DIR"

# Search upward for docker-compose.yml
PROJECT_ROOT=""
while [ "$CURRENT_DIR" != "/" ]; do
    if [ -f "$CURRENT_DIR/docker-compose.yml" ]; then
        PROJECT_ROOT="$CURRENT_DIR"
        break
    fi
    CURRENT_DIR="$(dirname "$CURRENT_DIR")"
done

if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: Could not find docker-compose.yml. Please run this script from within the project directory."
    exit 1
fi

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Restarting Zero Cache with Cleared Cache"
echo "=========================================="
echo ""
echo "This script will perform the following actions:"
echo ""
echo "  1. Stop zero-cache service"
echo "  2. Clear zero-cache data volume (remove container and volume)"
echo "  3. Restart zero-cache service with fresh cache (will resync from PostgreSQL)"
echo ""
echo "Project root: $PROJECT_ROOT"
echo ""

read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
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
