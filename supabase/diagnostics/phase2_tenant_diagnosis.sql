-- Read-only diagnosis for the Phase 2 tenant configuration.
-- Run in Supabase SQL Editor and share the Results table (not API keys).

-- 1. Every operational record and operational user must have a workshop.
SELECT 'clients_without_workshop' AS check_name, id::text, name AS label, workshop_id
FROM public.clients WHERE workshop_id IS NULL
UNION ALL
SELECT 'vehicles_without_workshop', id::text, plate, workshop_id
FROM public.vehicles WHERE workshop_id IS NULL
UNION ALL
SELECT 'orders_without_workshop', id::text, code, workshop_id
FROM public.work_orders WHERE workshop_id IS NULL
UNION ALL
SELECT 'staff_without_workshop', id::text, email, workshop_id
FROM public.users WHERE role IN ('technician', 'mechanic') AND workshop_id IS NULL;

-- 2. The active RLS policies for the affected tables. There must not be a
-- policy named "Allow all for authenticated users" after migration 003.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'clients', 'vehicles', 'work_orders', 'budgets', 'notifications')
ORDER BY tablename, policyname;
