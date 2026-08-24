-- Read-only gate to close Phase 1: critical security.
-- Run in Supabase SQL Editor. Expected: RLS enabled for every listed table and
-- no legacy policy such as "Allow all for authenticated users".

SELECT
  'RLS' AS check_type,
  table_name AS subject,
  CASE WHEN rls_enabled THEN 'enabled' ELSE 'DISABLED' END AS result
FROM (
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'users', 'workshops', 'clients', 'vehicles', 'work_orders',
      'budgets', 'notifications', 'work_logs'
    )
) AS tables

UNION ALL

SELECT
  'POLICY' AS check_type,
  tablename || ' → ' || policyname AS subject,
  cmd AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'workshops', 'clients', 'vehicles', 'work_orders',
    'budgets', 'notifications', 'work_logs'
  )

UNION ALL

SELECT
  'PROFILE_LINKS' AS check_type,
  'profiles without Google/Auth link' AS subject,
  COUNT(*)::text AS result
FROM public.users
WHERE auth_user_id IS NULL

UNION ALL

SELECT
  'TENANT_DATA' AS check_type,
  'operational records without workshop' AS subject,
  (
    (SELECT COUNT(*) FROM public.clients WHERE workshop_id IS NULL)
    + (SELECT COUNT(*) FROM public.vehicles WHERE workshop_id IS NULL)
    + (SELECT COUNT(*) FROM public.work_orders WHERE workshop_id IS NULL)
  )::text AS result

ORDER BY check_type, subject;
