#!/bin/bash
# Script to restore a database dump and set REPLICA IDENTITY
# Usage: ./restore_with_replica_identity.sh [dump_file] [target_database_url]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
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

echo "Step 1: Restoring database dump..."
pg_restore --no-owner -v -d "$TARGET_DB" "$DUMP_FILE" || {
    echo "Warning: Some restore errors may have occurred (this is often normal)"
}

echo "Step 2: Setting REPLICA IDENTITY on published tables..."
psql "$TARGET_DB" -f "$SCRIPT_DIR/set_replica_identity_after_restore.sql"

echo "Done! Database restored and REPLICA IDENTITY configured."

