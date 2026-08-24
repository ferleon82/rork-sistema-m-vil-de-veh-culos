-- Phase 2 workflow: a workshop is created before its technician exists.
BEGIN;

-- A workshop may initially have no assigned technical lead. This avoids the
-- circular dependency: a technician requires a workshop, but the workshop was
-- previously requiring an owner at creation time.
ALTER TABLE public.workshops
  ALTER COLUMN owner_id DROP NOT NULL;

-- Removing a technician must never delete the workshop and its operational
-- history. Keep the workshop and clear its optional responsible technician.
DO $$
DECLARE
  existing_fk TEXT;
BEGIN
  SELECT constraints.constraint_name
    INTO existing_fk
  FROM information_schema.key_column_usage AS key_usage
  JOIN information_schema.table_constraints AS constraints
    ON constraints.constraint_name = key_usage.constraint_name
   AND constraints.table_schema = key_usage.table_schema
  WHERE constraints.table_schema = 'public'
    AND constraints.table_name = 'workshops'
    AND constraints.constraint_type = 'FOREIGN KEY'
    AND key_usage.column_name = 'owner_id'
  LIMIT 1;

  IF existing_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.workshops DROP CONSTRAINT %I', existing_fk);
  END IF;
END;
$$;

ALTER TABLE public.workshops
  ADD CONSTRAINT workshops_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;

COMMIT;
