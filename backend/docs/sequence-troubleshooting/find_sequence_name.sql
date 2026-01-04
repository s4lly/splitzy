-- =============================================================================
-- Find the Sequence Name for user_receipts.id
-- =============================================================================
-- 
-- If the sequence name isn't user_receipts_id_seq, use this to find it.
-- This is useful if you're unsure about the exact sequence name.
--

-- =============================================================================
-- Method 3: Direct query using pg_get_serial_sequence (RECOMMENDED)
-- =============================================================================
-- This is the PostgreSQL-recommended approach and the most reliable method
-- for standard cases where the column uses a serial/bigserial type.
-- Use this as your primary method.
--
SELECT 
    pg_get_serial_sequence('user_receipts', 'id') as sequence_name;

-- =============================================================================
-- Method 1: Find sequence using the column's default value
-- =============================================================================
-- Useful when the sequence relationship is non-standard or when you need
-- to explore the column's default value expression. This method parses the
-- default value to extract the sequence name.
--
SELECT 
    t.table_name,
    c.column_name,
    c.column_default,
    -- Extract sequence name from default (format: nextval('sequence_name'::regclass))
    substring(
        c.column_default @
        FROM 'nextval\(''([^'']+)''::regclass\)'
    ) as sequence_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name 
    AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
    AND t.table_name = 'user_receipts'
    AND c.column_name = 'id'
    AND c.column_default LIKE 'nextval%';

-- =============================================================================
-- Method 2: Find all sequences in the database (broader search)
-- =============================================================================
-- Useful for exploration when you're unsure of the exact sequence name
-- or need to see all sequences related to receipts. This provides a broader
-- view but requires manual filtering of results.
--
SELECT 
    schemaname,
    sequencename,
    last_value,
    is_called
FROM pg_sequences
WHERE sequencename LIKE '%user_receipt%'
   OR sequencename LIKE '%receipt%id%';

