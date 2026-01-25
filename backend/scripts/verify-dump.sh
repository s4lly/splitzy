#!/bin/bash
# Verify a database dump by restoring it to a temporary Docker container
#
# This script:
#   1. Creates a temporary PostgreSQL container using Docker
#   2. Restores the dump file to the temporary database
#   3. Compares row counts between source and restored databases
#   4. Displays a comparison table
#   5. Automatically cleans up the temporary container
#
# Usage:
#   ./backend/scripts/verify-dump.sh <dump_file>
#   ./backend/scripts/verify-dump.sh backend/mydumpfile-2026-01-24-0830.bak
#
# Prerequisites:
#   - Docker must be installed and running
#   - pg_restore and psql must be available
#   - DATABASE_URL environment variable (or uses local dev default)
#   - Dump file must exist and be readable
#
# Note: This script can be run from any directory within the project.

set -e

# Cleanup function - ensures container is removed even on error or interrupt
cleanup() {
    if [ -n "$CONTAINER_NAME" ]; then
        echo ""
        echo "Cleaning up temporary container..."
        docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
        echo "Cleanup complete."
    fi
}

# Set trap to cleanup on exit, error, or interrupt
trap cleanup EXIT ERR INT TERM

# Find project root by searching upward for docker-compose.yml
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

# Check for required commands
if ! command -v docker &> /dev/null; then
    echo "Error: docker command not found. Please install Docker."
    exit 1
fi

if ! command -v pg_restore &> /dev/null; then
    echo "Error: pg_restore command not found. Please install PostgreSQL client tools."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

# Get dump file path from argument
DUMP_FILE="$1"

if [ -z "$DUMP_FILE" ]; then
    echo "Error: Dump file path is required."
    echo ""
    echo "Usage: $0 <dump_file>"
    echo "Example: $0 backend/mydumpfile-2026-01-24-0830.bak"
    exit 1
fi

# Resolve dump file path (handle relative paths)
if [ ! -f "$DUMP_FILE" ]; then
    # Try resolving relative to PROJECT_ROOT
    if [ -f "$PROJECT_ROOT/$DUMP_FILE" ]; then
        DUMP_FILE="$PROJECT_ROOT/$DUMP_FILE"
    else
        echo "Error: Dump file not found: $1"
        exit 1
    fi
fi

# Get absolute path for dump file
DUMP_FILE=$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")

# Get DATABASE_URL from environment, or use local dev default
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="postgresql://postgres:pass@localhost:5432/splitzy"
    echo "Note: DATABASE_URL not set, using local dev default for source database"
fi

# Parse DATABASE_URL to extract components
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Generate unique container name with random suffix
CONTAINER_NAME="splitzy-verify-$(date +%s)-$$"
VERIFY_DB_NAME="splitzy_verify"
VERIFY_DB_PORT="5433"

echo ""
echo "=========================================="
echo "Database Dump Verification"
echo "=========================================="
echo ""
echo "Dump file: $DUMP_FILE"
echo "Source database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""

# Step 1: Create temporary PostgreSQL container
echo "Step 1: Creating temporary PostgreSQL container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_PASSWORD=pass \
    -e POSTGRES_DB="$VERIFY_DB_NAME" \
    -p "$VERIFY_DB_PORT:5432" \
    postgres:17-alpine \
    postgres -c wal_level=logical > /dev/null

if [ $? -ne 0 ]; then
    echo "Error: Failed to create Docker container."
    exit 1
fi

echo "  Container created: $CONTAINER_NAME"
echo "  Port: $VERIFY_DB_PORT"

# Step 2: Wait for PostgreSQL to be ready
echo "Step 2: Waiting for PostgreSQL to be ready..."
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; then
        echo "  PostgreSQL is ready!"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo "Error: PostgreSQL did not become ready in time."
    exit 1
fi

# Step 3: Restore dump to temporary database
echo "Step 3: Restoring dump to temporary database..."
VERIFY_DB_URL="postgresql://postgres:pass@localhost:$VERIFY_DB_PORT/$VERIFY_DB_NAME"

# pg_restore flags explained:
#   -v             Verbose mode - shows progress
#   -O              No owner - skip ownership commands
#   -x              No privileges - skip ACL commands
#   -d <url>        Target database connection string
#   <dump_file>     Source dump file to restore
pg_restore -v -O -x -d "$VERIFY_DB_URL" "$DUMP_FILE" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "  Warning: Some errors occurred during restore (this may be normal for schema-only dumps)"
fi

echo "  Restore completed"
echo ""

# Step 4: Get list of tables from both databases
echo "Step 4: Comparing table row counts..."

# Function to get row count for a table
get_row_count() {
    local db_url="$1"
    local table_name="$2"
    psql "$db_url" -t -A -c "SELECT COUNT(*) FROM $table_name;" 2>/dev/null | tr -d ' ' || echo "0"
}

# Get list of user tables (exclude system tables) from source database
SOURCE_TABLES=$(psql "$DATABASE_URL" -t -A -c "
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    ORDER BY tablename;
" 2>/dev/null)

# If no tables found in source, try to get from dump file
if [ -z "$SOURCE_TABLES" ]; then
    echo "  Note: Could not query source database, extracting table list from dump..."
    SOURCE_TABLES=$(pg_restore --list "$DUMP_FILE" 2>/dev/null | grep "TABLE public" | sed 's/.*TABLE public //' | sed 's/ .*//' | sort -u || echo "")
fi

# If still no tables, use a default list
if [ -z "$SOURCE_TABLES" ]; then
    SOURCE_TABLES="users
user_receipts
receipt_line_items
alembic_version
assignments"
fi

# Compare row counts
echo ""
echo "=========================================="
echo "Row Count Comparison"
echo "=========================================="
printf "%-30s %15s %15s %10s\n" "Table" "Source" "Restored" "Status"
echo "----------------------------------------------------------------------------"

ALL_MATCH=true
for table in $SOURCE_TABLES; do
    # Skip empty lines
    [ -z "$table" ] && continue
    
    SOURCE_COUNT=$(get_row_count "$DATABASE_URL" "$table" 2>/dev/null || echo "?")
    RESTORED_COUNT=$(get_row_count "$VERIFY_DB_URL" "$table" 2>/dev/null || echo "?")
    
    if [ "$SOURCE_COUNT" = "$RESTORED_COUNT" ] && [ "$SOURCE_COUNT" != "?" ] && [ "$RESTORED_COUNT" != "?" ]; then
        STATUS="✓ MATCH"
        COLOR="\033[0;32m"  # Green
        RESET="\033[0m"
    else
        STATUS="✗ DIFF"
        COLOR="\033[0;31m"  # Red
        RESET="\033[0m"
        ALL_MATCH=false
    fi
    
    printf "%-30s %15s %15s ${COLOR}%10s${RESET}\n" "$table" "$SOURCE_COUNT" "$RESTORED_COUNT" "$STATUS"
done

echo "----------------------------------------------------------------------------"
echo ""

# Final summary
if [ "$ALL_MATCH" = true ]; then
    echo "✓ Verification PASSED: All table row counts match!"
    echo ""
    echo "The dump file appears to contain all your data."
else
    echo "✗ Verification FAILED: Some table row counts do not match."
    echo ""
    echo "Possible reasons:"
    echo "  - Data was added/modified after the dump was created"
    echo "  - Some tables failed to restore"
    echo "  - Source database is not accessible (showing '?')"
    echo ""
    echo "Check the table counts above to identify discrepancies."
fi

echo ""
echo "=========================================="
echo "Verification complete!"
echo "=========================================="
