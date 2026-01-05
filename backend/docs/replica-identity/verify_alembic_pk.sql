-- Verify that alembic_version has a primary key
-- This helps diagnose why Zero might not see it

-- Check if primary key constraint exists
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'alembic_version'::regclass
AND contype = 'p';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'alembic_version'
ORDER BY ordinal_position;

-- Check indexes on the table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'alembic_version';

