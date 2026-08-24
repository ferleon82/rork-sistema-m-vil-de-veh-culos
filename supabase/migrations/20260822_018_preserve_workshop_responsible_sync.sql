-- Preserve the approved business rule: assigning a technician to a workshop
-- automatically assigns that technician as the workshop's responsible lead.
-- This is enforced in Postgres and refreshed live in the mobile app.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_workshop_responsible_from_technician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove the old assignment only when this person was actually responsible.
  IF TG_OP = 'UPDATE'
    AND OLD.role = 'technician'
    AND OLD.workshop_id IS NOT NULL
    AND (NEW.role <> 'technician' OR NEW.workshop_id IS DISTINCT FROM OLD.workshop_id) THEN
    UPDATE public.workshops
    SET owner_id = NULL
    WHERE id = OLD.workshop_id AND owner_id = OLD.id;
  END IF;

  -- The most recently assigned technician becomes the responsible lead.
  IF NEW.role = 'technician'
    AND NEW.workshop_id IS NOT NULL
    AND (TG_OP = 'INSERT'
      OR OLD.role IS DISTINCT FROM 'technician'
      OR NEW.workshop_id IS DISTINCT FROM OLD.workshop_id) THEN
    UPDATE public.workshops
    SET owner_id = NEW.id
    WHERE id = NEW.workshop_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_workshop_responsible_from_technician ON public.users;
CREATE TRIGGER sync_workshop_responsible_from_technician
AFTER INSERT OR UPDATE OF role, workshop_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_workshop_responsible_from_technician();

-- Repair older workshops only when the responsible field is empty or invalid.
-- If several technicians exist, an explicit existing responsible assignment is
-- preserved; an empty workshop is filled only when there is exactly one choice.
WITH workshops_with_one_technician AS (
  SELECT workshop_id, MIN(id::text)::uuid AS technician_id
  FROM public.users
  WHERE role = 'technician' AND workshop_id IS NOT NULL
  GROUP BY workshop_id
  HAVING COUNT(*) = 1
)
UPDATE public.workshops AS workshop
SET owner_id = technician.technician_id
FROM workshops_with_one_technician AS technician
WHERE workshop.id = technician.workshop_id
  AND (
    workshop.owner_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.users AS owner
      WHERE owner.id = workshop.owner_id
        AND owner.role = 'technician'
        AND owner.workshop_id = workshop.id
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workshops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_workshop_responsible_from_technician() FROM PUBLIC;

COMMIT;
