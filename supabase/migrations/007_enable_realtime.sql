-- Enable Supabase Realtime for the conversations and appointments tables
-- This allows WebSockets to stream INSERT/UPDATE/DELETE events to the client wrappers

BEGIN;

-- Safety check: ensure supabase_realtime publication exists (Supabase default)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add the conversations table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Add the appointments table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

COMMIT;
