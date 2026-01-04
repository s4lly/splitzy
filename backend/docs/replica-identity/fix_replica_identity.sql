-- Fix REPLICA IDENTITY issue for alembic_version table
-- This is needed when a database with logical replication is restored
-- and the alembic_version table is part of a publication
--
-- Analysis of mydumpfile.bak shows:
-- 1. alembic_version table is created without REPLICA IDENTITY
-- 2. Publication _zero_public_0 includes ALL tables in public schema (line 1195)
-- 3. No REPLICA IDENTITY was set in the original dump
--
-- Solution: Set REPLICA IDENTITY on alembic_version table
-- This allows PostgreSQL to identify which rows changed for replication

ALTER TABLE public.alembic_version REPLICA IDENTITY FULL;

-- Alternative: If you don't need to replicate alembic_version, remove it from the publication:
-- ALTER PUBLICATION _zero_public_0 DROP TABLE public.alembic_version;

