-- Fix Zero replication error for alembic_version table
-- Zero requires a PRIMARY KEY or UNIQUE INDEX on all replicated tables
--
-- Error: "Cannot replicate table \"alembic_version\" without a PRIMARY KEY or UNIQUE INDEX"
--
-- Solution: Add a primary key to alembic_version
-- This is necessary because the publication uses "ADD TABLES IN SCHEMA public" which
-- automatically includes all tables in the schema, including alembic_version.
-- Since we can't easily exclude individual tables from schema-level publications,
-- adding a PK is the simplest fix.

-- Drop existing primary key if it exists (to ensure clean state)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'alembic_version'::regclass
        AND contype = 'p'
    ) THEN
        ALTER TABLE alembic_version DROP CONSTRAINT alembic_version_pkey;
        RAISE NOTICE 'Dropped existing primary key';
    END IF;
END $$;

-- Add primary key (this automatically creates a unique index)
ALTER TABLE alembic_version ADD PRIMARY KEY (version_num);

-- Verify the fix
DO $$
DECLARE
    has_pk BOOLEAN;
    has_unique_idx BOOLEAN;
BEGIN
    -- Check for primary key
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'alembic_version'::regclass
        AND contype = 'p'
    ) INTO has_pk;
    
    -- Check for unique index
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'alembic_version'
        AND indexname IN (
            SELECT i.relname
            FROM pg_index idx
            JOIN pg_class i ON i.oid = idx.indexrelid
            WHERE idx.indrelid = 'alembic_version'::regclass
            AND idx.indisunique = true
        )
    ) INTO has_unique_idx;
    
    IF has_pk AND has_unique_idx THEN
        RAISE NOTICE 'SUCCESS: alembic_version now has both PRIMARY KEY and UNIQUE INDEX';
    ELSE
        RAISE WARNING 'WARNING: alembic_version may not have required constraints';
    END IF;
END $$;

-- Note: After running this, you may need to:
-- 1. Reset Zero replication slots: ./reset_zero_replication.sh
-- 2. Or restart zero-cache with cleared cache: ./restart_zero_cache.sh

