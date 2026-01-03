-- Set REPLICA IDENTITY on all tables in publications before dumping
-- This ensures pg_dump will include the REPLICA IDENTITY settings
-- Run this on the SOURCE database before creating the dump

-- Find all tables in publications that don't have REPLICA IDENTITY set
-- and set it to FULL (or use PRIMARY KEY if the table has one)

DO $$
DECLARE
    table_record RECORD;
    has_pk BOOLEAN;
    pk_index TEXT;
    table_oid OID;
BEGIN
    -- Loop through all tables that are in publications
    FOR table_record IN
        SELECT DISTINCT 
            schemaname,
            tablename
        FROM pg_publication_tables
        WHERE schemaname = 'public'  -- Adjust schema if needed
    LOOP
        -- Get table OID
        SELECT oid INTO table_oid
        FROM pg_class
        WHERE relname = table_record.tablename
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = table_record.schemaname);
        
        -- Check if table has a primary key
        SELECT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = table_oid
            AND contype = 'p'
        ) INTO has_pk;
        
        -- Check current REPLICA IDENTITY ('d' = DEFAULT, meaning not set)
        IF (SELECT relreplident FROM pg_class WHERE oid = table_oid) = 'd' THEN
            IF has_pk THEN
                -- Get the primary key index name
                SELECT indexname INTO pk_index
                FROM pg_indexes
                WHERE schemaname = table_record.schemaname
                AND tablename = table_record.tablename
                AND indexname LIKE '%_pkey'
                LIMIT 1;
                
                -- Use PRIMARY KEY if available (more efficient)
                EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY USING INDEX %I',
                    table_record.schemaname, table_record.tablename, pk_index);
            ELSE
                -- Use FULL if no primary key
                EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL',
                    table_record.schemaname, table_record.tablename);
            END IF;
            
            RAISE NOTICE 'Set REPLICA IDENTITY on %.%', 
                table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- For alembic_version specifically (since it has no primary key):
ALTER TABLE public.alembic_version REPLICA IDENTITY FULL;

