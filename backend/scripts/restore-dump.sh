#!/bin/bash
# Restore a database dump created with create-dump.sh
#
# This script restores a PostgreSQL database dump file using pg_restore.
# It provides clear information about what will happen during the restore process.
#
# Usage:
#   ./backend/scripts/restore-dump.sh <dump_file>              # Restore without dropping existing data
#   ./backend/scripts/restore-dump.sh <dump_file> --clean     # Drop existing objects before restore (WIPES DATA!)
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection string (defaults to local dev if not set)
#                   Format: postgresql://user:password@host:port/database
#
# Important: Read the "What Happens During Restore" section below before running!
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

# Check if pg_restore is available
if ! command -v pg_restore &> /dev/null; then
    echo "Error: pg_restore command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Get dump file path and clean flag from arguments
DUMP_FILE="$1"
USE_CLEAN=false

if [ -z "$DUMP_FILE" ]; then
    echo "Error: Dump file path is required."
    echo ""
    echo "Usage: $0 <dump_file> [--clean]"
    echo ""
    echo "Examples:"
    echo "  $0 backend/mydumpfile-2026-01-24-0830.bak"
    echo "  $0 backend/mydumpfile-2026-01-24-0830.bak --clean"
    echo ""
    echo "Options:"
    echo "  --clean    Drop existing database objects before restore (WIPES ALL DATA!)"
    exit 1
fi

# Check for --clean flag
if [ "$2" = "--clean" ]; then
    USE_CLEAN=true
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
    echo "Note: DATABASE_URL not set, using local dev default: postgresql://postgres:***@localhost:5432/splitzy"
else
    # Mask password in output for security
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')
    echo "Using DATABASE_URL: $MASKED_URL"
fi

echo ""
echo "=========================================="
echo "Database Restore"
echo "=========================================="
echo ""
echo "Dump file: $DUMP_FILE"
echo ""

# ============================================================================
# WHAT HAPPENS DURING RESTORE - IMPORTANT INFORMATION
# ============================================================================
#
# By default (without --clean flag):
#   - pg_restore will NOT drop existing database objects (tables, sequences, etc.)
#   - If objects already exist, the restore will FAIL with errors like:
#     "ERROR: relation 'users' already exists"
#   - Your existing data will NOT be touched or deleted
#   - This is the SAFE option - use this if you want to preserve existing data
#
# With --clean flag:
#   - pg_restore will DROP existing database objects BEFORE restoring
#   - This WILL DELETE ALL EXISTING DATA in those tables
#   - Tables, sequences, and other objects will be dropped and recreated
#   - This is DESTRUCTIVE - only use if you want to completely replace the database
#
# What gets restored:
#   - All tables and their data
#   - Sequences (auto-increment counters)
#   - Indexes
#   - Constraints (foreign keys, unique constraints, etc.)
#   - NOT restored: ownership (using -O flag) and privileges (using -x flag)
#     This prevents permission errors when restoring to different users
#
# ============================================================================

if [ "$USE_CLEAN" = true ]; then
    echo "⚠️  WARNING: --clean flag is enabled!"
    echo ""
    echo "This will DROP all existing database objects before restoring."
    echo "ALL EXISTING DATA WILL BE DELETED!"
    echo ""
    read -p "Are you absolutely sure you want to continue? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Aborted. Your database is safe."
        exit 0
    fi
    echo ""
else
    echo "ℹ️  Restore mode: Safe (will not drop existing objects)"
    echo ""
    echo "If tables already exist, the restore will fail with errors."
    echo "To drop existing objects first, use: $0 $DUMP_FILE --clean"
    echo ""
    read -p "Continue with restore? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

echo "=========================================="
echo "Starting restore..."
echo ""

# Build pg_restore command
RESTORE_CMD="pg_restore"

# pg_restore flags explained:
#
#   -v              Verbose mode
#                   - Shows detailed progress information
#                   - Displays object names as they are restored
#                   - Useful for monitoring large restores
#
#   -O              No owner (skip ownership commands)
#                   - Prevents "permission denied" errors when restoring
#                   - Objects will be owned by the user running pg_restore
#                   - Essential when restoring to a different PostgreSQL instance
#                   - Without this, restore may fail if dump was created by different user
#
#   -x              No privileges (skip access privileges/ACL commands)
#                   - Prevents permission errors when restoring
#                   - Access control will match the restoring user's permissions
#                   - Useful for development/test environments
#
#   --clean         Drop database objects before recreating them
#                   - DROPS all tables, sequences, and other objects first
#                   - THIS WILL DELETE ALL EXISTING DATA
#                   - Use with --if-exists for safer drops (only drops if they exist)
#                   - Only use this if you want to completely replace the database
#
#   --if-exists     Use IF EXISTS when dropping objects (used with --clean)
#                   - Prevents errors if objects don't exist
#                   - Makes --clean safer and more idempotent
#                   - Recommended when using --clean flag
#
#   -d <url>        Target database connection string
#                   - Can be a connection URI (postgresql://...) or connection parameters
#                   - Includes user, password, host, port, and database name
#
#   <dump_file>     Source dump file to restore
#                   - Must be a custom format dump (created with pg_dump -F c)
#                   - Can be compressed (custom format is always compressed)
#
# Additional notes:
#   - Custom format dumps (created with create-dump.sh) can be restored with pg_restore
#   - Plain SQL dumps (created with pg_dump without -F c) must be restored with psql
#   - The restore process may show warnings for objects that already exist (without --clean)
#   - Some errors are normal (e.g., "already exists" without --clean, or "does not exist" with --clean)
#   - The restore will continue even if some objects fail (non-fatal errors)

if [ "$USE_CLEAN" = true ]; then
    # Use --clean with --if-exists for safer drops
    RESTORE_CMD="$RESTORE_CMD -v -O -x --clean --if-exists"
else
    # Safe restore without dropping existing objects
    RESTORE_CMD="$RESTORE_CMD -v -O -x"
fi

RESTORE_CMD="$RESTORE_CMD -d \"$DATABASE_URL\" \"$DUMP_FILE\""

echo "Running: pg_restore with flags:"
if [ "$USE_CLEAN" = true ]; then
    echo "  -v (verbose)"
    echo "  -O (no owner)"
    echo "  -x (no privileges)"
    echo "  --clean (drop existing objects - WILL DELETE DATA)"
    echo "  --if-exists (safer drops)"
else
    echo "  -v (verbose)"
    echo "  -O (no owner)"
    echo "  -x (no privileges)"
    echo "  (no --clean: will preserve existing data)"
fi
echo ""

# Execute the restore
eval "$RESTORE_CMD" || {
    RESTORE_EXIT_CODE=$?
    echo ""
    echo "=========================================="
    echo "Restore completed with warnings/errors"
    echo "=========================================="
    echo ""
    
    if [ "$USE_CLEAN" = false ]; then
        echo "Common causes of errors:"
        echo "  - Tables already exist (this is expected without --clean)"
        echo "  - Some objects may have been created already"
        echo ""
        echo "If you want to replace existing data, run:"
        echo "  $0 $DUMP_FILE --clean"
        echo ""
    else
        echo "Some errors may be normal when using --clean:"
        echo "  - Objects that don't exist yet (will be created)"
        echo "  - Some warnings about missing objects"
        echo ""
    fi
    
    echo "Check the output above for specific error messages."
    echo "The restore may have partially succeeded."
    exit $RESTORE_EXIT_CODE
}

echo ""
echo "=========================================="
echo "Restore completed successfully!"
echo "=========================================="
echo ""
echo "Your database has been restored from: $DUMP_FILE"
echo ""

if [ "$USE_CLEAN" = true ]; then
    echo "Note: All existing data was replaced with the dump contents."
else
    echo "Note: Existing data was preserved. If you saw errors about objects"
    echo "already existing, you may want to use --clean to replace them."
fi

echo ""
echo "To verify the restore, you can:"
echo "  1. Check your application to see if data is present"
echo "  2. Run: ./backend/scripts/verify-dump.sh $DUMP_FILE"
echo "     (Note: verify-dump.sh uses a temporary database, not your main database)"
echo ""
