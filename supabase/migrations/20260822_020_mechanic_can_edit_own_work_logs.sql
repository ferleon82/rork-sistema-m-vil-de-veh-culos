-- Mechanics may correct their own activity descriptions while the order is
-- still assigned to them. They cannot alter another mechanic's activity.

BEGIN;

GRANT UPDATE ON public.work_logs TO authenticated;

DROP POLICY IF EXISTS "work logs: mechanics update own assigned" ON public.work_logs;
CREATE POLICY "work logs: mechanics update own assigned" ON public.work_logs
FOR UPDATE TO authenticated
USING (
  mechanic_id = public.current_profile_id()
  AND public.current_user_role() = 'mechanic'
  AND EXISTS (
    SELECT 1 FROM public.work_orders AS work_order
    WHERE work_order.id = work_order_id
      AND work_order.assigned_to = public.current_profile_id()
      AND work_order.status IN ('pending', 'in_progress')
  )
)
WITH CHECK (
  mechanic_id = public.current_profile_id()
  AND public.current_user_role() = 'mechanic'
  AND EXISTS (
    SELECT 1 FROM public.work_orders AS work_order
    WHERE work_order.id = work_order_id
      AND work_order.assigned_to = public.current_profile_id()
      AND work_order.status IN ('pending', 'in_progress')
  )
);

COMMIT;
