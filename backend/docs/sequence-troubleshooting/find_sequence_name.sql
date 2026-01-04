-- =============================================================================
-- Find the Sequence Name for user_receipts.id
-- =============================================================================
-- 
-- If the sequence name isn't user_receipts_id_seq, use this to find it.
-- This is useful if you're unsure about the exact sequence name.
--

-- Method 1: Find sequence using the column's default value
SELECT 
    t.table_name,
    c.column_name,
    c.column_default,
    -- Extract sequence name from default (format: nextval('sequence_name'::regclass))
    substring(
        c.column_default 
        FROM 'nextval\(''([^'']+)''::regclass\)'
    ) as sequence_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name 
    AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
    AND t.table_name = 'user_receipts'
    AND c.column_name = 'id'
    AND c.column_default LIKE 'nextval%';

-- Method 2: Find all sequences in the database (broader search)
SELECT 
    schemaname,
    sequencename,
    last_value,
    is_called
FROM pg_sequences
WHERE sequencename LIKE '%user_receipt%'
   OR sequencename LIKE '%receipt%id%';

-- Method 3: Direct query to find sequence for a specific table/column
SELECT 
    pg_get_serial_sequence('user_receipts', 'id') as sequence_name;

