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
-- =============================================================================

-- 1. Check current sequence value
-- This shows the last value the sequence has generated (or will generate next)
SELECT 
    last_value,
    is_called,
    CASE 
        WHEN is_called THEN last_value + 1 
        ELSE last_value 
    END as next_value
FROM user_receipts_id_seq;

-- 2. Check the maximum ID currently in the table
SELECT 
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as total_rows
FROM user_receipts;

-- 3. Compare sequence value with max ID
-- If sequence value is less than max ID, you'll get conflicts
SELECT 
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as max_id_in_table,
    (SELECT last_value FROM user_receipts_id_seq) as sequence_last_value,
    CASE 
        WHEN (SELECT COALESCE(MAX(id), 0) FROM user_receipts) > 
             (SELECT last_value FROM user_receipts_id_seq)
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

-- Option 1: Set sequence to max(id) + 1 (safe - guarantees no conflicts)
SELECT setval(
    'user_receipts_id_seq', 
    (SELECT COALESCE(MAX(id), 0) + 1 FROM user_receipts),
    false  -- false = next call to nextval() will return this value
);

-- Option 2: Alternative syntax (same result)
-- SELECT setval('user_receipts_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM user_receipts));

-- =============================================================================
-- VERIFY THE FIX
-- =============================================================================
-- After running the fix, verify that the sequence is now correct:
SELECT 
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as max_id_in_table,
    (SELECT last_value FROM user_receipts_id_seq) as sequence_last_value,
    (SELECT last_value FROM user_receipts_id_seq) - 
    (SELECT COALESCE(MAX(id), 0) FROM user_receipts) as difference,
    CASE 
        WHEN (SELECT last_value FROM user_receipts_id_seq) >= 
             (SELECT COALESCE(MAX(id), 0) FROM user_receipts)
        THEN 'Sequence is now correctly set'
        ELSE 'Sequence still needs fixing'
    END as status;

