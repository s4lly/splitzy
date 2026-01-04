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

If this returns `NULL`, the column doesn't have a sequence attached. If it returns a name like `user_receipts_id_seq`, note that value for use in subsequent queries.

**Important**: Replace `<sequence_name>` in the queries below with the actual sequence name found in step 1, or use the dynamic resolution approach shown.

### 2. Check Current Sequence Value

**Option A: Using the sequence name directly** (replace `<sequence_name>` with the name from step 1):

```sql
-- Check the sequence's last value
-- Replace <sequence_name> with the actual sequence name from step 1
SELECT
    last_value,
    is_called,
    CASE
        WHEN is_called THEN last_value + 1
        ELSE last_value
    END as next_value
FROM <sequence_name>;
```

**Option B: Dynamic resolution using pg_sequences view** (PostgreSQL 10+):

```sql
-- Check the sequence's last value using dynamic resolution
SELECT
    last_value,
    last_value IS NOT NULL as is_called,  -- pg_sequences doesn't expose is_called directly
    CASE
        WHEN last_value IS NOT NULL THEN last_value + 1
        ELSE last_value
    END as next_value
FROM pg_sequences
WHERE schemaname = 'public'
    AND sequencename = (
        SELECT substring(
            pg_get_serial_sequence('user_receipts', 'id')
            FROM '[^.]*$'
        )
    );
```

**Note**: For queries requiring the sequence name in a FROM clause (like Option A), you must use the actual sequence name. Dynamic resolution works best for `setval()` and comparison queries where the sequence name is used as a parameter.

### 3. Check Maximum ID in Table

```sql
-- Find the maximum ID currently in the table
SELECT
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as total_rows
FROM user_receipts;
```

### 4. Compare and Diagnose

**Option A: Using the sequence name directly** (replace `<sequence_name>` with the name from step 1):

```sql
-- Compare sequence value with max ID
-- Replace <sequence_name> with the actual sequence name from step 1
SELECT
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as max_id_in_table,
    (SELECT last_value FROM <sequence_name>) as sequence_last_value,
    CASE
        WHEN (SELECT COALESCE(MAX(id), 0) FROM user_receipts) >
             (SELECT last_value FROM <sequence_name>)
        THEN 'SEQUENCE IS OUT OF SYNC - NEEDS FIXING'
        ELSE 'Sequence is OK'
    END as status;
```

**Option B: Dynamic resolution using pg_sequences view** (PostgreSQL 10+):

```sql
-- Compare sequence value with max ID using dynamic resolution
WITH seq_info AS (
    SELECT last_value
    FROM pg_sequences
    WHERE schemaname = 'public'
        AND sequencename = (
            SELECT substring(
                pg_get_serial_sequence('user_receipts', 'id')
                FROM '[^.]*$'
            )
        )
)
SELECT
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as max_id_in_table,
    (SELECT last_value FROM seq_info) as sequence_last_value,
    CASE
        WHEN (SELECT COALESCE(MAX(id), 0) FROM user_receipts) >
             (SELECT last_value FROM seq_info)
        THEN 'SEQUENCE IS OUT OF SYNC - NEEDS FIXING'
        ELSE 'Sequence is OK'
    END as status;
```

## Solution

If the sequence value is less than the maximum ID, fix it with:

**Option A: Using the sequence name directly** (replace `<sequence_name>` with the name from step 1):

```sql
-- Set sequence to max(id) + 1
-- Replace <sequence_name> with the actual sequence name from step 1
SELECT setval(
    '<sequence_name>',
    (SELECT COALESCE(MAX(id), 0) + 1 FROM user_receipts),
    false  -- false = next call to nextval() will return this value
);
```

**Option B: Dynamic resolution using pg_get_serial_sequence()**:

```sql
-- Set sequence to max(id) + 1 using dynamic resolution
SELECT setval(
    pg_get_serial_sequence('user_receipts', 'id'),
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

> **⚠️ CRITICAL WARNINGS FOR PRODUCTION OPERATIONS**
>
> Before running any fix scripts on a production database:
>
> 1. **Take a backup first**: Always create a database backup before running `setval()` or any sequence modification queries. This allows you to restore if something goes wrong.
>
> 2. **Understand concurrent insert impact**: The `setval()` function is generally safe, but be aware that:
>
>    - Concurrent inserts may occur while you're running the diagnostic queries
>    - The sequence value you observe might change between diagnosis and fix
>    - Consider the impact on active transactions during the fix operation
>
> 3. **Test in non-production first**: Always test the diagnostic and fix queries in a staging/development environment that mirrors your production schema before running them in production.
>
> 4. **Consider maintenance windows**: If your production database has high write activity, consider performing sequence fixes during a maintenance window or low-traffic period to minimize the risk of concurrent insert conflicts.
>
> 5. **Verify sequence name**: Double-check the sequence name using step 1 before running any fix queries to ensure you're modifying the correct sequence.

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

- The sequence name in PostgreSQL typically follows the pattern: `{table_name}_{column_name}_seq`, but this is not guaranteed
- Always use `pg_get_serial_sequence()` (step 1) to discover the actual sequence name rather than assuming the pattern
- If `pg_get_serial_sequence()` returns NULL, the column might not have auto-increment enabled, or the sequence was created with a non-standard name
- The `setval()` function with `false` as the third parameter ensures the next `nextval()` call returns the set value (not value + 1)
- For queries that require the sequence name in a FROM clause, you may need to use the sequence name directly (Option A) rather than dynamic resolution, as PostgreSQL's FROM clause requires a relation identifier
