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
#   ./backend/scripts/setup-local-db.sh                    # Start services without restore
#   ./backend/scripts/setup-local-db.sh mydumpfile.bak     # Restore from dump, then start services
#
# Note: This script can be run from any directory within the project.

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

# Handle dump file path - resolve relative paths relative to PROJECT_ROOT
DUMP_FILE="$1"
if [ -n "$DUMP_FILE" ] && [ ! -f "$DUMP_FILE" ]; then
    # Try resolving relative to PROJECT_ROOT
    if [ -f "$PROJECT_ROOT/$DUMP_FILE" ]; then
        DUMP_FILE="$PROJECT_ROOT/$DUMP_FILE"
    fi
fi

echo "=========================================="
echo "Splitzy Local Development Setup"
echo "=========================================="
echo ""
echo "This script will perform the following actions:"
echo ""
echo "  1. Start PostgreSQL container"
echo "  2. Wait for PostgreSQL to be ready"
if [ -n "$DUMP_FILE" ]; then
    echo "  3. Restore database from: $DUMP_FILE"
    echo "  4. Start zero-query and zero-cache services"
else
    echo "  3. Start zero-query and zero-cache services (no database restore)"
fi
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
    echo "  To restore, run: ./backend/scripts/setup-local-db.sh <dump_file>"
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
