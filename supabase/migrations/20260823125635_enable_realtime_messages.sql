-- ==============================================================================
-- ENABLE REALTIME FOR MESSAGES TABLE
-- ==============================================================================
-- This ensures that the global message toast notifications and chat syncing 
-- work perfectly across all devices and background tabs.

BEGIN;

-- 1. Ensure the 'messages' table is added to the Supabase Realtime publication.
-- This allows the Supabase Realtime server to broadcast INSERT/UPDATE/DELETE events.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- 2. Optional but recommended: set replica identity to FULL for messages so that 
-- DELETE and UPDATE payloads contain the old row data (useful if we ever need to 
-- show "Message Deleted" in realtime).
ALTER TABLE messages REPLICA IDENTITY FULL;

COMMIT;
