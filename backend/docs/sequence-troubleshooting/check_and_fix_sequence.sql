-- =============================================================================
-- Check and Fix Sequence for user_receipts.id
-- =============================================================================
-- 
-- This script helps diagnose and fix sequence synchronization issues
-- when the auto-increment sequence gets out of sync with actual data.
--
-- Common causes:
-- - Data restored/migrated with explicit IDs
-- - Manual ID inserts
-- - Database dumps/restores that don't preserve sequence state
--
-- This script uses dynamic sequence name resolution to work correctly
-- even when sequence names don't follow the standard pattern.
--
-- =============================================================================

-- First, verify the sequence name
-- If this returns NULL, the column doesn't have a sequence attached
SELECT pg_get_serial_sequence('user_receipts', 'id') as sequence_name;

-- =============================================================================
-- DIAGNOSTIC QUERIES
-- =============================================================================

-- 1. Check current sequence value
-- This shows the last value the sequence has generated (or will generate next)
-- Uses pg_sequences view for dynamic resolution (PostgreSQL 10+)
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

-- 2. Check the maximum ID currently in the table
SELECT 
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as total_rows
FROM user_receipts;

-- 3. Compare sequence value with max ID
-- If sequence value is less than max ID, you'll get conflicts
-- Uses pg_sequences view for dynamic resolution
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

-- =============================================================================
-- FIX THE SEQUENCE (run this if sequence is out of sync)
-- =============================================================================
-- 
-- This sets the sequence to the maximum ID + 1, ensuring the next insert
-- will use a value higher than any existing ID.
--
-- WARNING: Only run this if you've confirmed the sequence is out of sync!
-- 

-- Set sequence to max(id) + 1 using dynamic resolution (safe - guarantees no conflicts)
-- pg_get_serial_sequence() returns the sequence name as text, which setval() accepts directly
SELECT setval(
    pg_get_serial_sequence('user_receipts', 'id'),
    (SELECT COALESCE(MAX(id), 0) + 1 FROM user_receipts),
    false  -- false = next call to nextval() will return this value
);

-- =============================================================================
-- VERIFY THE FIX
-- =============================================================================
-- After running the fix, verify that the sequence is now correct:
-- Uses pg_sequences view for dynamic resolution
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
    (SELECT last_value FROM seq_info) - 
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as difference,
    CASE 
        WHEN (SELECT last_value FROM seq_info) >= 
             (SELECT COALESCE(MAX(id), 0) FROM user_receipts)
        THEN 'Sequence is now correctly set'
        ELSE 'Sequence still needs fixing'
    END as status;

