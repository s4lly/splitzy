-- Set REPLICA IDENTITY on all tables in publications after restoring
-- Run this on the TARGET database after pg_restore
-- This is a fallback in case REPLICA IDENTITY wasn't included in the dump

-- For alembic_version table (most common issue):
ALTER TABLE IF EXISTS public.alembic_version REPLICA IDENTITY FULL;

-- For all other tables in publications that don't have REPLICA IDENTITY:
DO $$
DECLARE
    table_record RECORD;
    has_pk BOOLEAN;
    pk_index TEXT;
    table_oid OID;
    identity_type TEXT;
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
        
        -- Check current REPLICA IDENTITY ('d' = DEFAULT, meaning not set)
        IF (SELECT relreplident FROM pg_class WHERE oid = table_oid) = 'd' THEN
            
            -- Check if table has a primary key
            SELECT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = table_oid
                AND contype = 'p'
            ) INTO has_pk;
            
            IF has_pk THEN
                -- Get the primary key index name from the constraint
                SELECT i.relname INTO pk_index
                FROM pg_constraint c
                JOIN pg_class i ON i.oid = c.conindid
                WHERE c.conrelid = table_oid
                AND c.contype = 'p';
                
                IF pk_index IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY USING INDEX %I',
                        table_record.schemaname, table_record.tablename, pk_index);
                    identity_type := 'INDEX (' || pk_index || ')';
                ELSE
                    EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL',
                        table_record.schemaname, table_record.tablename);
                    identity_type := 'FULL';
                END IF;
            ELSE
                -- Use FULL if no primary key
                EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL',
                    table_record.schemaname, table_record.tablename);
                identity_type := 'FULL';
            END IF;
            
            RAISE NOTICE 'Set REPLICA IDENTITY % on %.%', 
                identity_type, table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
END $$;

