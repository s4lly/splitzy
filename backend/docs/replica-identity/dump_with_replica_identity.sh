#!/bin/bash
# Script to create a database dump that includes REPLICA IDENTITY settings
# Usage: ./dump_with_replica_identity.sh [output_file]

set -e

# Resolve paths relative to this script's location (works from any directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="${1:-mydumpfile.bak}"
DATABASE_URL="${DATABASE_URL:-${NEON_DATABASE_URL}}"

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL or NEON_DATABASE_URL must be set"
    exit 1
fi

echo "Step 1: Setting REPLICA IDENTITY on published tables..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/set_replica_identity_before_dump.sql"

echo "Step 2: Creating database dump..."
pg_dump -Fc -v -d "$DATABASE_URL" -f "$OUTPUT_FILE"

echo "Done! Dump created: $OUTPUT_FILE"
echo "The dump now includes REPLICA IDENTITY settings for all published tables."

