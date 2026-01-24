#!/bin/bash
# Create a timestamped database dump using pg_dump
#
# This script creates a compressed, timestamped backup of your PostgreSQL database
# using pg_dump in custom format. The dump file can be restored using pg_restore.
#
# Usage:
#   ./backend/scripts/create-dump.sh                    # Uses DATABASE_URL from environment
#   ./backend/scripts/create-dump.sh                   # Or from backend directory: ./scripts/create-dump.sh
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection string (defaults to local dev if not set)
#                   Format: postgresql://user:password@host:port/database
#
# Output:
#   Creates a file named: mydumpfile-YYYY-MM-DD-HHMM.bak in the backend/ directory
#   Example: mydumpfile-2026-01-24-0830.bak
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

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "Error: pg_dump command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Get DATABASE_URL from environment, or use local dev default
if [ -z "$DATABASE_URL" ]; then
    # Default to local development database
    DATABASE_URL="postgresql://postgres:pass@localhost:5432/splitzy"
    echo "Note: DATABASE_URL not set, using local dev default: postgresql://postgres:***@localhost:5432/splitzy"
else
    # Mask password in output for security
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')
    echo "Using DATABASE_URL: $MASKED_URL"
fi

# Generate timestamp in format: YYYY-MM-DD-HHMM
# Example: 2026-01-24-0830 (January 24, 2026 at 8:30 AM)
TIMESTAMP=$(date +"%Y-%m-%d-%H%M")

# Output filename with timestamp
OUTPUT_FILE="$PROJECT_ROOT/backend/mydumpfile-${TIMESTAMP}.bak"

echo ""
echo "=========================================="
echo "Creating Database Dump"
echo "=========================================="
echo ""
echo "Output file: $OUTPUT_FILE"
echo ""

# Create the dump using pg_dump
# 
# pg_dump flags explained:
#   -F c          Custom format (compressed binary format)
#                 - Best compression ratio
#                 - Allows selective restore of specific tables/schemas
#                 - Required for pg_restore (cannot use plain SQL format)
#                 - Faster restore than plain SQL dumps
#
#   -v             Verbose mode
#                 - Shows progress information during dump
#                 - Useful for monitoring large databases
#                 - Displays object names as they are dumped
#
#   -d <url>       Database connection string
#                 - Can be a connection URI (postgresql://...) or connection parameters
#                 - Includes user, password, host, port, and database name
#                 - Alternative: Use -h, -U, -p, -d flags separately
#
#   -f <file>     Output file path
#                 - Where to write the dump file
#                 - If not specified, writes to stdout
#
#   -O             No owner (skip ownership commands)
#                 - Prevents "permission denied" errors when restoring to different user
#                 - Useful when restoring to a different PostgreSQL instance
#                 - Objects will be owned by the user running pg_restore
#
#   -x             No privileges (skip access privileges/ACL commands)
#                 - Prevents permission errors when restoring
#                 - Useful for development/test environments
#                 - Access control will match the restoring user's permissions
#
# Additional notes:
#   - The custom format (-F c) creates a compressed file that's typically 50-70% smaller
#     than plain SQL dumps
#   - Custom format dumps can be restored with pg_restore, which allows:
#     * Selective table restoration
#     * Parallel restoration (--jobs flag)
#     * Schema-only or data-only restoration
#   - For production backups, consider adding:
#     * --no-owner and --no-privileges (already included)
#     * --clean (drop objects before creating - use with caution)
#     * --if-exists (use with --clean for safer drops)
#
# Security note:
#   - The DATABASE_URL contains a password that may be visible in process lists (ps)
#   - For production, consider using .pgpass file instead:
#     Format: hostname:port:database:username:password
#     File location: ~/.pgpass (with 0600 permissions)
#   - Never commit DATABASE_URL with real passwords to version control

echo "Starting dump..."
pg_dump \
    -F c \
    -v \
    -d "$DATABASE_URL" \
    -f "$OUTPUT_FILE" \
    -O \
    -x

# Check if dump was successful
if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo ""
    echo "=========================================="
    echo "Dump completed successfully!"
    echo ""
    echo "File: $OUTPUT_FILE"
    echo "Size: $FILE_SIZE"
    echo ""
    echo "To verify this dump, run:"
    echo "  ./backend/scripts/verify-dump.sh $OUTPUT_FILE"
    echo ""
    echo "To restore this dump, use:"
    echo "  pg_restore -v -O -x -d 'postgresql://user:pass@host:port/database' $OUTPUT_FILE"
    echo "=========================================="
else
    echo ""
    echo "Error: Dump failed or output file was not created."
    exit 1
fi
