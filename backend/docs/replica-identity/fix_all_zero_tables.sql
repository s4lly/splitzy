-- Fix all tables in Zero publication that don't have primary keys
-- This script adds primary keys to tables that need them for Zero replication
--
-- Note: Only run this on tables that should be replicated by Zero.
-- For tables like alembic_version, adding a PK is safe since it only has one row.

-- Fix alembic_version (if not already fixed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'alembic_version'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE alembic_version ADD PRIMARY KEY (version_num);
        RAISE NOTICE 'Added primary key to alembic_version';
    ELSE
        RAISE NOTICE 'alembic_version already has a primary key';
    END IF;
END $$;

-- Check for other tables without primary keys
-- Add more fixes here as needed for other tables

