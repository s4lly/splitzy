#!/bin/bash
# Script to restore a database dump and set REPLICA IDENTITY
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
echo "  --no-owner  : Skip restoration of object ownership (avoids permission errors)"
echo "  -v          : Verbose mode (shows progress and details)"
echo "  -d          : Connect to the specified database"
echo "=========================================="
echo ""

echo "Step 1: Restoring database dump..."
pg_restore --no-owner -v -d "$TARGET_DB" "$DUMP_FILE" || {
    echo "Warning: Some restore errors may have occurred (this is often normal)"
}

echo "Step 2: Setting REPLICA IDENTITY on published tables..."
SQL_FILE="$SCRIPT_DIR/set_replica_identity_after_restore.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "Error: SQL file not found: $SQL_FILE"
    exit 1
fi
psql "$TARGET_DB" -f "$SQL_FILE"

echo "Done! Database restored and REPLICA IDENTITY configured."

