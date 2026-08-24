-- Phase 2 repair: remove the previous policy sets that conflict with tenant RLS.
-- The app now identifies a person by users.auth_user_id, not users.id = auth.uid().
BEGIN;

-- These policies predate the Auth migration.  PostgreSQL combines permissive
-- policies with OR, so leaving any of them enabled defeats the new isolation.
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Usuarios ven colegas de su taller" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;

DROP POLICY IF EXISTS "Acceso a vehículos por taller" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_write_staff" ON public.vehicles;

DROP POLICY IF EXISTS "Acceso a órdenes por taller y rol" ON public.work_orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_delete_staff" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_insert_staff" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_select" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_update_staff_or_assignee" ON public.work_orders;

DROP POLICY IF EXISTS "Acceso a presupuestos por taller" ON public.budgets;
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
DROP POLICY IF EXISTS "budgets_write_staff" ON public.budgets;

DROP POLICY IF EXISTS "Acceso a notificaciones por taller" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_write_staff" ON public.notifications;

-- Fix the outer-reference ambiguity in the original policy.  This prevents
-- false matches such as o.vehicle_id = o.id and avoids the policy recursion
-- caused by the retired legacy work_orders policy.
DROP POLICY IF EXISTS "vehicles: permitted readers" ON public.vehicles;
CREATE POLICY "vehicles: permitted readers" ON public.vehicles FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR workshop_id = public.current_workshop_id()
  OR EXISTS (
    SELECT 1
    FROM public.work_orders AS work_order
    WHERE work_order.vehicle_id = public.vehicles.id
      AND work_order.assigned_to = public.current_profile_id()
  )
);

COMMIT;
