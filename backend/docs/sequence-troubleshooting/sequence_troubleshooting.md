# PostgreSQL Sequence Troubleshooting Guide

## Problem

When inserting new rows into `user_receipts`, you get a primary key constraint violation error. This typically happens when:

1. Data was restored/migrated with explicit IDs
2. The auto-increment sequence value is lower than the maximum ID in the table
3. The next sequence value conflicts with an existing ID

## Quick Diagnosis

Run these queries on your database to check the sequence status:

### 1. Find the Sequence Name

First, verify what sequence is being used (if any):

```sql
-- Find the sequence name for user_receipts.id
SELECT pg_get_serial_sequence('user_receipts', 'id') as sequence_name;
```

If this returns `NULL`, the column doesn't have a sequence attached. If it returns a name like `user_receipts_id_seq`, that's your sequence.

### 2. Check Current Sequence Value

```sql
-- Check the sequence's last value
SELECT
    last_value,
    is_called,
    CASE
        WHEN is_called THEN last_value + 1
        ELSE last_value
    END as next_value
FROM user_receipts_id_seq;
```

### 3. Check Maximum ID in Table

```sql
-- Find the maximum ID currently in the table
SELECT
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as total_rows
FROM user_receipts;
```

### 4. Compare and Diagnose

```sql
-- Compare sequence value with max ID
SELECT
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as max_id_in_table,
    (SELECT last_value FROM user_receipts_id_seq) as sequence_last_value,
    CASE
        WHEN (SELECT COALESCE(MAX(id), 0) FROM user_receipts) >
             (SELECT last_value FROM user_receipts_id_seq)
        THEN 'SEQUENCE IS OUT OF SYNC - NEEDS FIXING'
        ELSE 'Sequence is OK'
    END as status;
```

## Solution

If the sequence value is less than the maximum ID, fix it with:

```sql
-- Set sequence to max(id) + 1
SELECT setval(
    'user_receipts_id_seq',
    (SELECT COALESCE(MAX(id), 0) + 1 FROM user_receipts),
    false  -- false = next call to nextval() will return this value
);
```

## Complete SQL Script

See `check_and_fix_sequence.sql` for a complete diagnostic and fix script.

## Running the Queries

### Local Development (Docker)

```bash
# Connect to local PostgreSQL
docker exec -it $(docker-compose ps -q db-splitzy-local) psql -U postgres -d splitzy
```

Then run the queries above.

### Production Database

Connect to your production database using your connection string:

```bash
# Using psql with connection string
psql "your-database-connection-string"
```

Or use a database client like pgAdmin, DBeaver, or the Neon console.

## Prevention

To prevent this issue in the future:

1. **When restoring data**: Always reset sequences after restoring data with explicit IDs
2. **After migrations**: If migrations insert data with explicit IDs, reset sequences
3. **After data imports**: Check and fix sequences after bulk data imports

## Additional Notes

- The sequence name in PostgreSQL follows the pattern: `{table_name}_{column_name}_seq`
- If `pg_get_serial_sequence()` returns NULL, the column might not have auto-increment enabled
- The `setval()` function with `false` as the third parameter ensures the next `nextval()` call returns the set value (not value + 1)
