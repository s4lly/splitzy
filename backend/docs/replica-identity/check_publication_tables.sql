-- Diagnostic script to check which tables in the Zero publication don't have primary keys
-- This helps identify tables that will cause Zero replication errors

SELECT 
    pt.schemaname,
    pt.tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class cl ON cl.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            WHERE n.nspname = pt.schemaname
            AND cl.relname = pt.tablename
            AND c.contype = 'p'
        ) THEN 'HAS PK'
        WHEN EXISTS (
            SELECT 1
            FROM pg_indexes i
            WHERE i.schemaname = pt.schemaname
            AND i.tablename = pt.tablename
            AND i.indexname IN (
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = pt.schemaname
                AND tablename = pt.tablename
            )
            AND EXISTS (
                SELECT 1
                FROM pg_index idx
                JOIN pg_class idxcls ON idxcls.oid = idx.indexrelid
                WHERE idxcls.relname = i.indexname
                AND idx.indisunique = true
            )
        ) THEN 'HAS UNIQUE INDEX'
        ELSE 'NO PK/UNIQUE INDEX'
    END as replication_status,
    CASE relreplident
        WHEN 'd' THEN 'DEFAULT'
        WHEN 'n' THEN 'NOTHING'
        WHEN 'f' THEN 'FULL'
        WHEN 'i' THEN 'USING INDEX'
    END as replica_identity
FROM pg_publication_tables pt
JOIN pg_class c ON c.relname = pt.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = pt.schemaname
WHERE pt.pubname = '_zero_public_0'
ORDER BY replication_status, pt.tablename;

