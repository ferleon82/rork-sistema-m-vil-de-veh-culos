-- Phase 2: every operational user must belong to a workshop.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_operational_roles_require_workshop'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_operational_roles_require_workshop
      CHECK (role = 'admin' OR workshop_id IS NOT NULL) NOT VALID;
  END IF;
END;
$$;

-- This succeeds only when existing technicians and mechanics already have a
-- workshop. The Phase 1 diagnostic confirmed that prerequisite.
ALTER TABLE public.users
  VALIDATE CONSTRAINT users_operational_roles_require_workshop;

COMMIT;
