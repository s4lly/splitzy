-- Drop all Zero replication slots
-- Use this script in production after stopping zero-cache
-- This forces Zero to re-discover the schema on next startup
--
-- WARNING: This will cause Zero to perform a full resync from scratch
-- Only run this when zero-cache is stopped or you're about to redeploy it

DO $$
DECLARE
    slot_record RECORD;
    slots_dropped INTEGER := 0;
BEGIN
    -- Find and drop all Zero-related replication slots
    FOR slot_record IN
        SELECT slot_name
        FROM pg_replication_slots
        WHERE slot_name LIKE '%zero%' 
           OR slot_name LIKE '%_zero_%'
        ORDER BY slot_name
    LOOP
        BEGIN
            RAISE NOTICE 'Dropping replication slot: %', slot_record.slot_name;
            PERFORM pg_drop_replication_slot(slot_record.slot_name);
            slots_dropped := slots_dropped + 1;
            RAISE NOTICE 'Successfully dropped slot: %', slot_record.slot_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to drop slot %: %', slot_record.slot_name, SQLERRM;
        END;
    END LOOP;
    
    IF slots_dropped = 0 THEN
        RAISE NOTICE 'No Zero replication slots found to drop';
    ELSE
        RAISE NOTICE 'Dropped % replication slot(s)', slots_dropped;
    END IF;
END $$;

-- Verify all slots are dropped
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: All Zero replication slots have been dropped'
        ELSE 'WARNING: ' || COUNT(*) || ' Zero replication slot(s) still exist'
    END as status
FROM pg_replication_slots
WHERE slot_name LIKE '%zero%' 
   OR slot_name LIKE '%_zero_%';

