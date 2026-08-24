-- Final Phase 1 repair: remove legacy workshop policies that bypass RLS.
BEGIN;

-- Keep only the canonical policies created in 20260820_002_tenant_rls.sql:
--   workshops: permitted readers
--   workshops: admin writes
-- PostgreSQL combines permissive policies with OR, so any legacy policy can
-- otherwise grant broader access than intended.
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.workshops;
DROP POLICY IF EXISTS "workshops_select" ON public.workshops;
DROP POLICY IF EXISTS "workshops_write_global_admin" ON public.workshops;

COMMIT;
