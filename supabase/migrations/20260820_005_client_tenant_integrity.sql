-- Business rule: each client belongs to exactly one workshop. Technicians use
-- their own workshop automatically; only administrators may choose a workshop.
BEGIN;

-- The diagnostics exposed policies left by a previous version. Because RLS
-- policies are permissive by default, any one of these could expose every
-- client even when the newer policy is correct.
DROP POLICY IF EXISTS "Acceso a clientes por taller" ON public.clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_write_staff" ON public.clients;

-- A client cannot exist outside a workshop in this product model. This is safe
-- only after the read-only diagnosis reports no clients_without_workshop rows.
ALTER TABLE public.clients
  ALTER COLUMN workshop_id SET NOT NULL;

-- The mobile app supplies this value for a technician, but the server must
-- enforce the rule as well: a technician can never create or move a client to
-- another workshop. Administrators retain the explicit workshop selector.
CREATE OR REPLACE FUNCTION public.assign_client_workshop_from_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.workshop_id := public.current_workshop_id();
  END IF;

  IF NEW.workshop_id IS NULL THEN
    RAISE EXCEPTION 'A client must belong to a workshop'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_client_workshop_from_actor ON public.clients;
CREATE TRIGGER assign_client_workshop_from_actor
BEFORE INSERT OR UPDATE OF workshop_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.assign_client_workshop_from_actor();

DROP POLICY IF EXISTS "clients: workshop managers write" ON public.clients;
CREATE POLICY "clients: workshop managers write" ON public.clients
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
  )
);

COMMIT;
