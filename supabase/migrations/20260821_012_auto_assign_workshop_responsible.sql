-- Phase 2: assigning a technician to a workshop automatically makes them the
-- workshop's responsible technician. This is database-enforced, not UI-only.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_workshop_responsible_from_technician()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear the previous workshop only when this technician was its responsible
  -- person and they were moved away or changed to another role.
  IF TG_OP = 'UPDATE'
    AND OLD.role = 'technician'
    AND OLD.workshop_id IS NOT NULL
    AND (NEW.role <> 'technician' OR NEW.workshop_id IS DISTINCT FROM OLD.workshop_id)
  THEN
    UPDATE public.workshops
    SET owner_id = NULL
    WHERE id = OLD.workshop_id
      AND owner_id = OLD.id;
  END IF;

  -- A newly assigned technician becomes responsible for their workshop.
  IF NEW.role = 'technician'
    AND NEW.workshop_id IS NOT NULL
    AND (
      TG_OP = 'INSERT'
      OR OLD.role <> 'technician'
      OR NEW.workshop_id IS DISTINCT FROM OLD.workshop_id
    )
  THEN
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

-- Safely repair workshops created before this trigger: only fill an empty
-- responsible field when the workshop has exactly one technician.
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
  AND workshop.owner_id IS NULL;

COMMIT;
