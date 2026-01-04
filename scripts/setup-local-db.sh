#!/bin/bash
# Setup script for local development with database restore
#
# This script:
#   1. Starts the PostgreSQL container
#   2. Waits for it to be healthy
#   3. Restores the database from a dump file (optional)
#   4. Starts the remaining services (zero-query, zero-cache)
#
# Usage:
#   ./scripts/setup-local-db.sh                    # Start services without restore
#   ./scripts/setup-local-db.sh mydumpfile.bak     # Restore from dump, then start services
#
# Note: This script can be run from any directory.

set -e

# Resolve paths relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP_FILE="$1"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Splitzy Local Development Setup"
echo "=========================================="
echo ""

# Step 1: Start only the database
echo "Step 1: Starting PostgreSQL..."
docker-compose up -d db-splitzy-local

# Step 2: Wait for database to be healthy
echo "Step 2: Waiting for PostgreSQL to be ready..."
until docker-compose exec -T db-splitzy-local pg_isready -U postgres > /dev/null 2>&1; do
    echo "  Waiting for database..."
    sleep 2
done
echo "  PostgreSQL is ready!"
echo ""

# Step 3: Restore database if dump file provided
if [ -n "$DUMP_FILE" ]; then
    if [ -f "$DUMP_FILE" ]; then
        echo "Step 3: Restoring database from $DUMP_FILE..."
        
        # Use the local database URL
        LOCAL_DB_URL="postgresql://postgres:pass@localhost:5432/splitzy"
        
        # Run the restore script
        "$PROJECT_ROOT/backend/docs/replica-identity/restore_with_replica_identity.sh" "$DUMP_FILE" "$LOCAL_DB_URL"
        echo ""
    else
        echo "Error: Dump file not found: $DUMP_FILE"
        exit 1
    fi
else
    echo "Step 3: Skipping database restore (no dump file specified)"
    echo "  To restore, run: ./scripts/setup-local-db.sh <dump_file>"
    echo ""
fi

# Step 4: Start remaining services
echo "Step 4: Starting zero-query and zero-cache services..."
docker-compose up -d zero-query-local zero-cache-local

echo ""
echo "=========================================="
echo "Setup complete!"
echo ""
echo "Services running:"
echo "  - PostgreSQL:   localhost:5432"
echo "  - Zero Query:   localhost:3000"
echo "  - Zero Cache:   localhost:4848"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop all:  docker-compose down"
echo "=========================================="

