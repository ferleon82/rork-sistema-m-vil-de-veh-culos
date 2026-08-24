-- Keep the technician and mechanic views synchronized when either role changes
-- an order or registers activities. Existing RLS policies still control which
-- rows each connected user can receive.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'work_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'work_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_logs;
  END IF;
END;
$$;
