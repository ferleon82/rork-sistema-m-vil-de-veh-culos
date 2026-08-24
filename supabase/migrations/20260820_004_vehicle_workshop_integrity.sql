-- Keep a vehicle's tenant equal to its client's tenant on every write.
-- This makes client_id the authoritative source and closes gaps from stale
-- mobile state or manually crafted API requests.
BEGIN;

CREATE OR REPLACE FUNCTION public.set_vehicle_workshop_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT client.workshop_id
    INTO NEW.workshop_id
  FROM public.clients AS client
  WHERE client.id = NEW.client_id;

  IF NEW.workshop_id IS NULL THEN
    RAISE EXCEPTION 'The selected client does not belong to a workshop'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_vehicle_workshop_id ON public.vehicles;
CREATE TRIGGER set_vehicle_workshop_id
BEFORE INSERT OR UPDATE OF client_id ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_vehicle_workshop_id();

-- Require technicians to use a client from their own workshop.  The trigger
-- above then writes the matching workshop_id before this WITH CHECK runs.
DROP POLICY IF EXISTS "vehicles: workshop managers write" ON public.vehicles;
CREATE POLICY "vehicles: workshop managers write" ON public.vehicles
FOR ALL TO authenticated
USING (
  public.is_admin()
  OR (
    public.current_user_role() = 'technician'
    AND workshop_id = public.current_workshop_id()
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    public.current_user_role() = 'technician'
    AND workshop_id = public.current_workshop_id()
    AND EXISTS (
      SELECT 1
      FROM public.clients AS client
      WHERE client.id = public.vehicles.client_id
        AND client.workshop_id = public.current_workshop_id()
    )
  )
);

COMMIT;
