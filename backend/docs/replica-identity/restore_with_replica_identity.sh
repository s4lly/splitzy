#!/bin/bash
# Script to restore a database dump and set REPLICA IDENTITY
# Uses clean restore (drops existing objects) so restore is deterministic and constraints apply.
# Usage: ./restore_with_replica_identity.sh [dump_file] [target_database_url]

set -e

# Resolve paths relative to this script's location (works from any directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# Source .env file if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE..."
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
else
    echo "Error: .env file not found at $ENV_FILE"
    echo ""
    echo "Please copy the .env.example file to create your .env file:"
    echo "  cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
    echo ""
    echo "Then edit the .env file with your configuration values."
    exit 1
fi

DUMP_FILE="${1:-mydumpfile.bak}"
TARGET_DB="${2:-${DATABASE_URL:-${NEON_DATABASE_URL}}}"

if [ -z "$TARGET_DB" ]; then
    echo "Error: TARGET_DB, DATABASE_URL, or NEON_DATABASE_URL must be set"
    exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: Dump file not found: $DUMP_FILE"
    exit 1
fi

echo "=========================================="
echo "Restore Configuration:"
echo "  Target Database: $(echo "$TARGET_DB" | sed -E 's|://[^:]+:[^@]+@|://***:***@|')"
echo "  Dump File: $DUMP_FILE"
echo ""
echo "pg_restore options:"
echo "  -O, --no-owner : Skip restoration of object ownership (avoids permission errors)"
echo "  -x             : Skip access privileges"
echo "  --clean        : Drop existing objects before restore (deterministic replace)"
echo "  --if-exists    : Use IF EXISTS when dropping (safe with --clean)"
echo "  -v             : Verbose mode"
echo "=========================================="
echo ""

echo "Step 1: Restoring database dump (clean mode: existing objects dropped first)..."
pg_restore -v -O -x --clean --if-exists -d "$TARGET_DB" "$DUMP_FILE"

echo "Step 2: Setting REPLICA IDENTITY on published tables..."
SQL_FILE="$SCRIPT_DIR/set_replica_identity_after_restore.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "Error: SQL file not found: $SQL_FILE"
    exit 1
fi
psql "$TARGET_DB" -f "$SQL_FILE"

echo "Step 3: Ensuring alembic_version has primary key (required for Zero replication)..."
TABLE_EXISTS=$(psql "$TARGET_DB" -t -A -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version');")
if [ "$TABLE_EXISTS" = "t" ]; then
    HAS_PK=$(psql "$TARGET_DB" -t -A -c "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.alembic_version'::regclass AND contype = 'p');")
    if [ "$HAS_PK" != "t" ]; then
        FIX_SQL="$SCRIPT_DIR/fix_zero_alembic_version.sql"
        if [ -f "$FIX_SQL" ]; then
            psql "$TARGET_DB" -f "$FIX_SQL"
        else
            echo "Error: $FIX_SQL not found; Zero will fail without a primary key on alembic_version."
            exit 1
        fi
    fi
fi

echo "Done! Database restored and REPLICA IDENTITY configured."

