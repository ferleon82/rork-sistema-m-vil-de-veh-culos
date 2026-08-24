-- Mechanics report completed activities; only managers manage billable items.
BEGIN;

CREATE TABLE IF NOT EXISTS public.work_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_logs_work_order_id ON public.work_logs(work_order_id, created_at DESC);

ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.work_logs TO authenticated;

DROP POLICY IF EXISTS "work logs: permitted readers" ON public.work_logs;
DROP POLICY IF EXISTS "work logs: mechanics insert assigned" ON public.work_logs;

CREATE POLICY "work logs: permitted readers" ON public.work_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders AS work_order
    WHERE work_order.id = work_order_id
      AND (
        public.is_admin()
        OR (public.current_user_role() = 'technician' AND work_order.workshop_id = public.current_workshop_id())
        OR work_order.assigned_to = public.current_profile_id()
      )
  )
);

CREATE POLICY "work logs: mechanics insert assigned" ON public.work_logs
FOR INSERT TO authenticated
WITH CHECK (
  mechanic_id = public.current_profile_id()
  AND public.current_user_role() = 'mechanic'
  AND EXISTS (
    SELECT 1 FROM public.work_orders AS work_order
    WHERE work_order.id = work_order_id
      AND work_order.assigned_to = public.current_profile_id()
  )
);

COMMIT;
