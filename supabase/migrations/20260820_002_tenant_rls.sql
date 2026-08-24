-- Phase 2: enforce tenant isolation and role-based access in Postgres.
BEGIN;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES public.workshops(id) ON DELETE RESTRICT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES public.workshops(id) ON DELETE RESTRICT;

UPDATE public.vehicles AS vehicle
SET workshop_id = client.workshop_id
FROM public.clients AS client
WHERE vehicle.client_id = client.id AND vehicle.workshop_id IS NULL;

UPDATE public.work_orders AS work_order
SET workshop_id = vehicle.workshop_id
FROM public.vehicles AS vehicle
WHERE work_order.vehicle_id = vehicle.id AND work_order.workshop_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_workshop_id ON public.vehicles(workshop_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_workshop_id ON public.work_orders(workshop_id);

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::public.user_role FROM public.users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_workshop_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workshop_id FROM public.users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_role() = 'admin'
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_id(), public.current_user_role(), public.current_workshop_id(), public.is_admin() TO authenticated;

-- Remove legacy open policies from every table.
DROP POLICY IF EXISTS "Allow all operations on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations on workshops" ON public.workshops;
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all operations on work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Allow all operations on budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;

CREATE POLICY "workshops: permitted readers" ON public.workshops FOR SELECT TO authenticated
USING (public.is_admin() OR id = public.current_workshop_id());
CREATE POLICY "workshops: admin writes" ON public.workshops FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "clients: permitted readers" ON public.clients FOR SELECT TO authenticated
USING (public.is_admin() OR workshop_id = public.current_workshop_id());
CREATE POLICY "clients: workshop managers write" ON public.clients FOR ALL TO authenticated
USING (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()))
WITH CHECK (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()));

CREATE POLICY "vehicles: permitted readers" ON public.vehicles FOR SELECT TO authenticated
USING (public.is_admin() OR workshop_id = public.current_workshop_id() OR EXISTS (SELECT 1 FROM public.work_orders o WHERE o.vehicle_id = id AND o.assigned_to = public.current_profile_id()));
CREATE POLICY "vehicles: workshop managers write" ON public.vehicles FOR ALL TO authenticated
USING (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()))
WITH CHECK (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()));

CREATE POLICY "orders: permitted readers" ON public.work_orders FOR SELECT TO authenticated
USING (public.is_admin() OR workshop_id = public.current_workshop_id() OR assigned_to = public.current_profile_id());
CREATE POLICY "orders: managers write" ON public.work_orders FOR ALL TO authenticated
USING (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()))
WITH CHECK (public.is_admin() OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id()));

CREATE POLICY "budgets: permitted readers" ON public.budgets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.work_orders o WHERE o.id = work_order_id AND (public.is_admin() OR o.workshop_id = public.current_workshop_id() OR o.assigned_to = public.current_profile_id())));
CREATE POLICY "budgets: managers write" ON public.budgets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.work_orders o WHERE o.id = work_order_id AND (public.is_admin() OR (public.current_user_role() = 'technician' AND o.workshop_id = public.current_workshop_id()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders o WHERE o.id = work_order_id AND (public.is_admin() OR (public.current_user_role() = 'technician' AND o.workshop_id = public.current_workshop_id()))));

CREATE POLICY "notifications: managers only" ON public.notifications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.work_orders o WHERE o.id = work_order_id AND (public.is_admin() OR (public.current_user_role() = 'technician' AND o.workshop_id = public.current_workshop_id()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders o WHERE o.id = work_order_id AND (public.is_admin() OR (public.current_user_role() = 'technician' AND o.workshop_id = public.current_workshop_id()))));

COMMIT;
