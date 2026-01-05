# REPLICA IDENTITY Issue with Logical Replication

## Problem Description

When restoring a PostgreSQL database dump that was created from a source database with logical replication enabled (specifically Zero Sync by Rocicorp), the `flask db upgrade` command fails with the following error:

```
psycopg2.errors.ObjectNotInPrerequisiteState: cannot update table "alembic_version" because it does not have a replica identity and publishes updates
HINT:  To enable updating the table, set REPLICA IDENTITY using ALTER TABLE.
```

This error occurs when Alembic tries to update the `alembic_version` table to record the new migration version.

## Root Cause

### What Happened

1. **Source Database Configuration**: The source database had logical replication enabled with Zero Sync, which uses PostgreSQL publications to replicate data changes.

2. **Publication Setup**: The publication `_zero_public_0` was configured to include ALL tables in the `public` schema:

   ```sql
   ALTER PUBLICATION _zero_public_0 ADD TABLES IN SCHEMA public;
   ```

   This automatically includes the `alembic_version` table.

3. **Missing REPLICA IDENTITY**: The `alembic_version` table was created without a REPLICA IDENTITY set:

   ```sql
   CREATE TABLE public.alembic_version (
       version_num character varying(32) NOT NULL
   );
   ```

   The table has no primary key, so it would need `REPLICA IDENTITY FULL` to be set.

4. **Dump Process**: When `pg_dump` was used to create the dump:

   ```bash
   pg_dump -Fc -v -d $DATABASE_URL -f mydumpfile.bak
   ```

   The dump file did NOT include any `ALTER TABLE ... REPLICA IDENTITY` statements because:

   - `pg_dump` doesn't capture REPLICA IDENTITY settings when they're set to DEFAULT
   - The source database never had REPLICA IDENTITY explicitly set on `alembic_version`

5. **Restore Process**: When the dump was restored using `pg_restore --no-owner`:

   - The publication was recreated and included all tables in the `public` schema
   - The `alembic_version` table was restored without REPLICA IDENTITY
   - The table is now part of a publication but lacks the required REPLICA IDENTITY

6. **Migration Failure**: When Alembic tries to UPDATE the `alembic_version` table, PostgreSQL blocks it because:
   - The table is part of a publication (logical replication)
   - The table doesn't have REPLICA IDENTITY set
   - PostgreSQL requires REPLICA IDENTITY on published tables to identify which rows changed for replication

### Why PostgreSQL Requires REPLICA IDENTITY

When a table is part of a logical replication publication, PostgreSQL needs to know how to identify rows that have been updated or deleted. This is what REPLICA IDENTITY provides:

- **REPLICA IDENTITY DEFAULT**: Uses the primary key (if available) or nothing
- **REPLICA IDENTITY USING INDEX**: Uses a specific unique index
- **REPLICA IDENTITY FULL**: Uses all columns to identify the row

For tables without a primary key (like `alembic_version`), you must explicitly set `REPLICA IDENTITY FULL` if the table is in a publication.

## Solution

### Quick Fix (What We Did)

The immediate fix was to set REPLICA IDENTITY on the `alembic_version` table:

```sql
ALTER TABLE public.alembic_version REPLICA IDENTITY FULL;
```

This allows Alembic to update the table successfully.

**File**: `fix_replica_identity.sql`

### Long-Term Solutions

To prevent this issue in future dumps, we've created scripts that handle REPLICA IDENTITY settings:

#### Solution 1: Set REPLICA IDENTITY Before Dumping (Recommended)

**Before creating the dump**, run this script on your source database:

```bash
psql $DATABASE_URL -f docs/replica-identity/set_replica_identity_before_dump.sql
```

This script:

- Finds all tables in publications that don't have REPLICA IDENTITY set
- Sets REPLICA IDENTITY to use the primary key (if available) or FULL (if no primary key)
- Ensures `pg_dump` will include these settings in the dump

Then create your dump as usual:

```bash
pg_dump -Fc -v -d $DATABASE_URL -f mydumpfile.bak
```

**Or use the automated script**:

```bash
./docs/replica-identity/dump_with_replica_identity.sh mydumpfile.bak
```

**Files**:

- `set_replica_identity_before_dump.sql` - SQL script to set REPLICA IDENTITY
- `dump_with_replica_identity.sh` - Automated dump script

#### Solution 2: Set REPLICA IDENTITY After Restoring

**After restoring the dump**, run this script on your target database:

```bash
psql $TARGET_DATABASE_URL -f docs/replica-identity/set_replica_identity_after_restore.sql
```

This script:

- Sets REPLICA IDENTITY on all tables in publications that don't have it set
- Acts as a fallback in case REPLICA IDENTITY wasn't included in the dump

**Or use the automated restore script**:

```bash
./docs/replica-identity/restore_with_replica_identity.sh mydumpfile.bak $TARGET_DATABASE_URL
```

**Files**:

- `set_replica_identity_after_restore.sql` - SQL script to set REPLICA IDENTITY
- `restore_with_replica_identity.sh` - Automated restore script

## Files in This Directory

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `fix_replica_identity.sql`               | Quick fix for `alembic_version` table only (REPLICA IDENTITY)         |
| `fix_zero_alembic_version.sql`           | Fix Zero replication error by adding primary key to `alembic_version` |
| `drop_zero_replication_slots.sql`        | Drop all Zero replication slots (for production use)                  |
| `check_publication_tables.sql`           | Diagnostic script to check which tables have primary keys             |
| `check_replication_slots.sql`            | Check current replication slots                                       |
| `verify_alembic_pk.sql`                  | Verify that `alembic_version` has a primary key                       |
| `set_replica_identity_before_dump.sql`   | Set REPLICA IDENTITY on all published tables before dumping           |
| `set_replica_identity_after_restore.sql` | Set REPLICA IDENTITY on all published tables after restoring          |
| `dump_with_replica_identity.sh`          | Automated script to set REPLICA IDENTITY and create dump              |
| `restore_with_replica_identity.sh`       | Automated script to restore dump and set REPLICA IDENTITY             |
| `restart_zero_cache.sh`                  | Restart zero-cache with cleared cache (local development)             |
| `reset_zero_replication.sh`              | Reset Zero replication slots (local development)                      |
| `PRODUCTION_RESET_GUIDE.md`              | Guide for resetting replication slots in production                   |

## Best Practices

1. **For Production Dumps**: Always set REPLICA IDENTITY before dumping to ensure the dump is complete and can be restored without manual intervention.

2. **For Development**: You can use the after-restore script as a fallback, but it's better to fix it at the source.

3. **For New Tables**: When creating new tables that will be in publications, always set REPLICA IDENTITY at creation time:

   ```sql
   CREATE TABLE my_table (...);
   ALTER TABLE my_table REPLICA IDENTITY FULL;  -- or USING INDEX if you have a primary key
   ```

4. **Check Current Settings**: To see which tables need REPLICA IDENTITY:
   ```sql
   SELECT
       schemaname,
       tablename,
       CASE relreplident
           WHEN 'd' THEN 'DEFAULT (not set)'
           WHEN 'n' THEN 'NOTHING'
           WHEN 'f' THEN 'FULL'
           WHEN 'i' THEN 'USING INDEX'
       END as replica_identity
   FROM pg_publication_tables pt
   JOIN pg_class c ON c.relname = pt.tablename
   JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = pt.schemaname
   WHERE pt.schemaname = 'public';
   ```

## Zero-Specific Issue: PRIMARY KEY Requirement

### Problem: Zero Replication Error

When running Flask migrations with Zero-cache active, you may encounter this error:

```
Error: Cannot replicate table "alembic_version" without a PRIMARY KEY or UNIQUE INDEX
```

This is a **different issue** from the REPLICA IDENTITY problem above.

### Key Distinction

- **REPLICA IDENTITY**: PostgreSQL's logical replication requires this to identify which rows changed. Setting `REPLICA IDENTITY FULL` satisfies PostgreSQL's requirement.

- **Zero's PRIMARY KEY Requirement**: Zero-cache has an **additional requirement** beyond REPLICA IDENTITY - it explicitly requires a **PRIMARY KEY or UNIQUE INDEX** on every table it replicates. `REPLICA IDENTITY FULL` is **not sufficient** for Zero.

### Solution for Zero

The publication `_zero_public_0` is configured to include ALL tables in the `public` schema:

```sql
ALTER PUBLICATION _zero_public_0 ADD TABLES IN SCHEMA public;
```

This automatically includes `alembic_version`, which Zero then tries to replicate. Since Zero requires a PK/unique index and `alembic_version` has neither, replication fails.

**Recommended Fix**: Add a primary key to `alembic_version`:

```sql
ALTER TABLE alembic_version ADD PRIMARY KEY (version_num);
```

**File**: `fix_zero_alembic_version.sql`

**To apply the fix:**

```bash
psql $DATABASE_URL -f backend/docs/replica-identity/fix_zero_alembic_version.sql
```

**Why add a PK instead of excluding from publication?**

When a publication uses `ADD TABLES IN SCHEMA public`, it automatically includes all tables in that schema. You cannot easily exclude individual tables from schema-level publications using `DROP TABLE` (you'll get an error: "relation is not part of the publication"). Adding a primary key is the simplest and most reliable solution.

**Alternative**: If you want to exclude the table, you would need to reconfigure the publication to explicitly list tables instead of using schema-level inclusion, which is more complex and error-prone.

**Important Notes**:

- **`flask db upgrade` will NOT undo the primary key**: Alembic migrations do not modify the structure of the `alembic_version` table. They only update the `version_num` value. Once you add the primary key, it will persist across all future migrations.

- **After adding the primary key**: You may need to reset Zero replication slots so it re-discovers the schema. See the [Production Reset Guide](./PRODUCTION_RESET_GUIDE.md) for details.

## Related Documentation

- [Production Reset Guide](./PRODUCTION_RESET_GUIDE.md) - How to reset replication slots in production

- [PostgreSQL Logical Replication Documentation](https://www.postgresql.org/docs/current/logical-replication.html)
- [REPLICA IDENTITY Documentation](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-REPLICA-IDENTITY)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)

## Summary

### REPLICA IDENTITY Issue

The issue occurs because:

1. Logical replication publications require REPLICA IDENTITY on tables
2. `pg_dump` doesn't include REPLICA IDENTITY when it's set to DEFAULT
3. The `alembic_version` table has no primary key and needs `REPLICA IDENTITY FULL`

The fix is to set REPLICA IDENTITY before dumping (preferred) or after restoring (fallback).

### Zero PRIMARY KEY Issue

Zero-cache requires a PRIMARY KEY or UNIQUE INDEX on all replicated tables, regardless of REPLICA IDENTITY settings. For `alembic_version`, the recommended fix is to add a primary key (since excluding it from schema-level publications is not practical). After adding the primary key, reset Zero replication slots to force schema re-discovery.
