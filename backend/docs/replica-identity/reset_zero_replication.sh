#!/bin/bash
# Script to reset Zero replication slots
# This forces Zero to re-discover the schema with the new primary key
#
# WARNING: This will cause Zero to do a full resync from scratch
# Only run this if you're okay with losing the current Zero cache state

set -e

# Resolve paths relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try multiple locations for .env file
ENV_FILE=""
for candidate in "$BACKEND_DIR/.env" "$PROJECT_ROOT/backend/.env" "$PROJECT_ROOT/.env"; do
    if [ -f "$candidate" ]; then
        ENV_FILE="$candidate"
        break
    fi
done

# Source .env file if it exists
if [ -n "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE..."
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
else
    echo "Warning: No .env file found. Checked:"
    echo "  - $BACKEND_DIR/.env"
    echo "  - $PROJECT_ROOT/backend/.env"
    echo "  - $PROJECT_ROOT/.env"
    echo ""
fi

DATABASE_URL="${DATABASE_URL:-${NEON_DATABASE_URL}}"

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL or NEON_DATABASE_URL must be set"
    exit 1
fi

echo "=========================================="
echo "Reset Zero Replication Slots"
echo "=========================================="
echo ""
echo "WARNING: This will drop all replication slots and force Zero to resync from scratch"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1: Stopping zero-cache service..."
cd "$PROJECT_ROOT"
docker-compose stop zero-cache-local || true

echo "Step 2: Checking for replication slots..."
SLOTS=$(psql "$DATABASE_URL" -t -c "SELECT slot_name FROM pg_replication_slots WHERE slot_name LIKE '%zero%' OR slot_name LIKE '%_zero_%';" | xargs)

if [ -z "$SLOTS" ]; then
    echo "  No Zero replication slots found."
else
    echo "  Found slots: $SLOTS"
    echo ""
    echo "Step 3: Dropping replication slots..."
    for slot in $SLOTS; do
        echo "  Dropping slot: $slot"
        psql "$DATABASE_URL" -c "SELECT pg_drop_replication_slot('$slot');" || echo "    Warning: Could not drop slot $slot"
    done
fi

echo ""
echo "Step 4: Clearing zero-cache volume..."
docker-compose rm -f zero-cache-local 2>/dev/null || true
docker volume rm zero-cache-local-data 2>/dev/null || true

echo ""
echo "Step 5: Starting zero-cache service..."
docker-compose up -d zero-cache-local

echo ""
echo "=========================================="
echo "Zero replication reset complete"
echo ""
echo "Zero will now create new replication slots and discover the schema"
echo "with the primary key on alembic_version."
echo ""
echo "View logs: docker-compose logs -f zero-cache-local"
echo "=========================================="

