# Production Guide: Resetting Zero Replication Slots

## Overview

This guide explains how to reset Zero replication slots in a production environment. This is necessary when:

- Schema changes are made (e.g., adding primary keys to tables)
- Zero-cache is failing with replication errors
- You need to force Zero to re-discover the database schema

## Important Notes

- **Zero-cache volumes are ephemeral**: In production, zero-cache volumes are typically cleared on each deployment, so you don't need to manually clear them
- **Replication slots persist**: Replication slots are stored in PostgreSQL, not in the Zero container, so they persist across deployments
- **Full resync required**: Resetting replication slots will cause Zero to perform a full resync from scratch

## Prerequisites

- Access to your production PostgreSQL database
- Database connection string or credentials
- Ability to run SQL commands against the database
- Access to your deployment platform (to redeploy zero-cache if needed)

## Order of Operations

**Important**: Follow these steps in order to ensure everything works correctly:

1. **Run Flask migrations first** (`flask db upgrade`)

   - This ensures your database schema is up to date
   - Creates or updates the `alembic_version` table if needed
   - Note: Alembic migrations do NOT modify the structure of `alembic_version` (they only update the version number), so any primary key you add will persist

2. **Add primary key to `alembic_version`** (if missing)

   - Run: `psql $DATABASE_URL -f backend/docs/replica-identity/fix_zero_alembic_version.sql`
   - This is safe to run even if the PK already exists (the script checks first)
   - Verify with: `psql $DATABASE_URL -f backend/docs/replica-identity/verify_alembic_pk.sql`

3. **Stop zero-cache** (if running)

   - Ensures no active connections are using replication slots

4. **Drop replication slots**

   - Run: `psql $DATABASE_URL -f backend/docs/replica-identity/drop_zero_replication_slots.sql`
   - This forces Zero to re-discover the schema on next startup

5. **Redeploy zero-cache**
   - Zero will create new replication slots and discover the updated schema
   - The ephemeral volume will be fresh, so no manual cache clearing needed

**Why this order?**

- Running migrations first ensures the database schema is correct before Zero tries to replicate it
- Adding the primary key after migrations ensures it's applied to the current schema state
- Resetting replication slots must happen after schema changes so Zero sees the updated schema
- Redeploying zero-cache last ensures it starts with the correct schema from the beginning

## Step-by-Step Guide

### Step 1: Run Flask Migrations

First, ensure your database schema is up to date:

```bash
# From your backend directory
flask db upgrade
```

This will:

- Apply any pending migrations
- Update the `alembic_version` table with the current migration version
- Ensure all tables are in the correct state

**Note**: If `alembic_version` doesn't exist yet, Alembic will create it (without a primary key), which is why we add the PK in the next step.

### Step 2: Add Primary Key to alembic_version

If `alembic_version` doesn't have a primary key (which is required for Zero replication), add it:

```bash
psql $DATABASE_URL -f backend/docs/replica-identity/fix_zero_alembic_version.sql
```

Verify the primary key was added:

```bash
psql $DATABASE_URL -f backend/docs/replica-identity/verify_alembic_pk.sql
```

You should see a primary key constraint named `alembic_version_pkey`.

### Step 3: Verify the Issue

Check which replication slots exist:

```sql
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag_size
FROM pg_replication_slots
ORDER BY slot_name;
```

Look for slots with names containing `zero` or `_zero_`.

### Step 4: Check Current Schema State

Verify that all tables in the publication have the required primary keys:

```bash
psql $DATABASE_URL -f backend/docs/replica-identity/check_publication_tables.sql
```

All tables should show `HAS PK` in the `replication_status` column. If any show `NO PK/UNIQUE INDEX`, you'll need to add primary keys to those tables as well.

### Step 5: Stop Zero-Cache (If Running)

If zero-cache is currently running and causing issues, stop it through your deployment platform. This ensures no active connections are using the replication slots.

**Note**: In most production setups, you'll redeploy zero-cache after resetting slots, which automatically stops the old instance.

### Step 6: Drop Replication Slots

Connect to your production database and drop all Zero-related replication slots:

```sql
-- List all Zero replication slots
SELECT slot_name
FROM pg_replication_slots
WHERE slot_name LIKE '%zero%'
   OR slot_name LIKE '%_zero_%';

-- Drop each slot (replace 'slot_name' with actual slot names from above)
SELECT pg_drop_replication_slot('slot_name');
```

**Example script** (run this after identifying slots):

```sql
DO $$
DECLARE
    slot_record RECORD;
BEGIN
    FOR slot_record IN
        SELECT slot_name
        FROM pg_replication_slots
        WHERE slot_name LIKE '%zero%'
           OR slot_name LIKE '%_zero_%'
    LOOP
        RAISE NOTICE 'Dropping replication slot: %', slot_record.slot_name;
        PERFORM pg_drop_replication_slot(slot_record.slot_name);
    END LOOP;
END $$;
```

### Step 7: Verify Slots Are Dropped

Confirm that all Zero replication slots have been removed:

```sql
SELECT slot_name
FROM pg_replication_slots
WHERE slot_name LIKE '%zero%'
   OR slot_name LIKE '%_zero_%';
```

This should return no rows.

### Step 8: Redeploy Zero-Cache

Redeploy your zero-cache service through your deployment platform. The new deployment will:

1. Start with a fresh container (no cached schema)
2. Create new replication slots
3. Re-discover the database schema (including any new primary keys)
4. Perform a full initial sync

**Note**: Since production volumes are ephemeral, you don't need to manually clear the cache volume - it will be fresh on each deployment.

### Step 9: Monitor the Deployment

Watch the zero-cache logs to ensure it starts successfully:

```bash
# Example commands (adjust for your platform)
kubectl logs -f deployment/zero-cache
# or
docker-compose logs -f zero-cache
# or
# Check your platform's log viewer
```

Look for:

- Successful connection to PostgreSQL
- Creation of new replication slots
- Successful schema discovery
- No errors about missing primary keys

### Step 10: Verify Replication is Working

After zero-cache starts, verify that new replication slots were created:

```sql
SELECT
    slot_name,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag_size
FROM pg_replication_slots
WHERE slot_name LIKE '%zero%'
   OR slot_name LIKE '%_zero_%';
```

You should see new slots with `active = true`.

## Common Scenarios

### Scenario 1: Adding Primary Key to Existing Table

If you've added a primary key to a table (like `alembic_version`):

1. **Run migrations first**: `flask db upgrade` (ensures schema is current)
2. **Add primary key**: Run `fix_zero_alembic_version.sql` to add PK to `alembic_version`
3. **Zero still fails**: Because it cached the old schema in replication slots
4. **Solution**: Follow Steps 5-10 of this guide to reset replication slots and redeploy

### Scenario 2: Schema Changes After Zero Deployment

If you've made schema changes after Zero was already running:

1. **Run migrations**: `flask db upgrade` to apply schema changes
2. **Add/fix primary keys**: If needed, add primary keys to any new or modified tables
3. Zero's cached schema in replication slots is now stale
4. **Solution**: Reset replication slots (Steps 5-10) to force re-discovery

### Scenario 3: Zero Failing on Startup

If Zero fails immediately on startup with replication errors:

1. **Run migrations**: `flask db upgrade` to ensure schema is current
2. **Check primary keys**: Verify all tables have required primary keys
3. If primary keys exist, the issue is likely stale replication slots
4. **Solution**: Reset replication slots (Steps 5-10) and redeploy

## Safety Considerations

### When to Reset Slots

✅ **Safe to reset**:

- During maintenance windows
- When Zero is already failing
- After schema changes that require re-discovery
- When you can tolerate a full resync

❌ **Avoid resetting**:

- During peak traffic (if Zero is critical)
- Without verifying schema is correct first
- If you're unsure about the impact

### Impact Assessment

- **Downtime**: Zero-cache will be unavailable during the reset and initial sync
- **Resync time**: Depends on database size; can take minutes to hours
- **Data loss**: No data loss, but Zero cache will be rebuilt from scratch
- **Application impact**: Depends on whether your app can function without Zero during resync

## Troubleshooting

### Slots Won't Drop

If you get an error that a slot is in use:

```sql
ERROR: replication slot "slot_name" is active
```

1. Ensure zero-cache is stopped
2. Check for any other connections using the slot:
   ```sql
   SELECT * FROM pg_replication_slots WHERE slot_name = 'slot_name';
   ```
3. If `active = true`, there's still a connection. Wait for it to disconnect or kill the connection.

### Zero Still Fails After Reset

If Zero still fails after resetting slots:

1. Verify primary keys exist on all published tables
2. Check Zero logs for specific error messages
3. Verify publication configuration:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = '_zero_public_0';
   ```
4. Ensure `wal_level = logical` in PostgreSQL:
   ```sql
   SHOW wal_level;
   ```

### Slow Resync

If the resync is taking a long time:

- This is normal for large databases
- Monitor progress in Zero logs
- Check replication lag:
  ```sql
  SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))
  FROM pg_replication_slots
  WHERE slot_name LIKE '%zero%';
  ```

## Automated Script

For convenience, you can create a script similar to the local `reset_zero_replication.sh` but adapted for production:

```bash
#!/bin/bash
# Production script to reset Zero replication slots
# Usage: ./reset_zero_production.sh $DATABASE_URL

set -e

DATABASE_URL="$1"

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL required"
    echo "Usage: $0 <DATABASE_URL>"
    exit 1
fi

echo "=========================================="
echo "Resetting Zero Replication Slots (Production)"
echo "=========================================="
echo ""
echo "WARNING: This will drop all Zero replication slots"
echo "Database: $(echo "$DATABASE_URL" | sed -E 's|://[^:]+:[^@]+@|://***:***@|')"
echo ""
read -p "Are you sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Dropping replication slots..."

psql "$DATABASE_URL" <<EOF
DO \$\$
DECLARE
    slot_record RECORD;
BEGIN
    FOR slot_record IN
        SELECT slot_name
        FROM pg_replication_slots
        WHERE slot_name LIKE '%zero%'
           OR slot_name LIKE '%_zero_%'
    LOOP
        RAISE NOTICE 'Dropping replication slot: %', slot_record.slot_name;
        PERFORM pg_drop_replication_slot(slot_record.slot_name);
    END LOOP;
END \$\$;
EOF

echo ""
echo "=========================================="
echo "Replication slots reset complete"
echo ""
echo "Next steps:"
echo "1. Redeploy zero-cache service"
echo "2. Monitor logs for successful startup"
echo "3. Verify new slots are created"
echo "=========================================="
```

## Related Documentation

- [Local Development Reset Guide](../replica-identity/README.md) - For local development
- [REPLICA IDENTITY Documentation](./README.md) - Understanding replication requirements
- [Zero Documentation](https://rocicorp.github.io/zero/) - Official Zero documentation

## Summary

Resetting Zero replication slots in production (correct order):

1. ✅ **Run Flask migrations**: `flask db upgrade` (ensures schema is current)
2. ✅ **Add primary keys**: Fix any missing primary keys (e.g., `alembic_version`)
3. ✅ **Verify schema**: Check that all published tables have primary keys
4. ✅ **Stop zero-cache**: Stop the service (or redeploy will handle this)
5. ✅ **Drop replication slots**: Remove all Zero replication slots from PostgreSQL
6. ✅ **Redeploy zero-cache**: Deploy new instance (creates fresh slots and cache)
7. ✅ **Monitor deployment**: Watch logs for successful startup
8. ✅ **Verify replication**: Confirm new slots are created and replication works

**Key Points**:

- Always run migrations **before** resetting replication slots
- Production volumes are ephemeral, so you only need to reset replication slots in PostgreSQL
- The order matters: migrations → fix schema → reset slots → redeploy
