-- Shared operational workflow, internal notifications and client budget approvals.
-- The operational status stays small; commercial approval is deliberately stored
-- separately so it does not create extra steps for the mechanic.

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'not_required';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_orders_approval_status_check'
      AND conrelid = 'public.work_orders'::regclass
  ) THEN
    ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_approval_status_check
      CHECK (approval_status IN ('not_required', 'draft', 'pending', 'approved', 'partial', 'rejected', 'expired', 'revoked'));
  END IF;
END;
$$;

-- Normalize the former status model into the compact workflow.
UPDATE public.work_orders
SET
  status = CASE
    -- The deployed project stores this column as TEXT. Keep every branch
    -- textual so this migration also works on installations that retain the
    -- legacy enum solely for the transition RPC signature.
    WHEN status IN ('diagnosis', 'waiting_approval') THEN 'pending'
    WHEN status = 'approved' THEN 'in_progress'
    ELSE status
  END,
  approval_required = status = 'waiting_approval',
  approval_status = CASE
    WHEN status = 'waiting_approval' THEN 'pending'
    ELSE approval_status
  END;

CREATE TABLE IF NOT EXISTS public.budget_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'partial', 'rejected', 'expired', 'revoked')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  token_hash TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  client_comment TEXT,
  decisions JSONB,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, version)
);

CREATE TABLE IF NOT EXISTS public.work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  -- work_orders.status is TEXT in the deployed schema. Keep its audit values
  -- textual too; the transition RPC may still accept the legacy enum.
  previous_status TEXT,
  next_status TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order_assigned', 'work_started', 'review_requested', 'work_returned', 'ready_for_delivery', 'order_closed', 'order_cancelled', 'budget_approved', 'budget_rejected', 'budget_partial', 'approval_required')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_user_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_budget_approvals_order ON public.budget_approvals(work_order_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_work_order_events_order ON public.work_order_events(work_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(recipient_user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.budget_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget approvals: managers read" ON public.budget_approvals;
CREATE POLICY "budget approvals: managers read" ON public.budget_approvals FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (public.current_user_role() = 'technician' AND workshop_id = public.current_workshop_id())
);

DROP POLICY IF EXISTS "order events: permitted readers" ON public.work_order_events;
CREATE POLICY "order events: permitted readers" ON public.work_order_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders AS work_order
    WHERE work_order.id = work_order_id
      AND (public.is_admin() OR work_order.workshop_id = public.current_workshop_id() OR work_order.assigned_to = public.current_profile_id())
  )
);

DROP POLICY IF EXISTS "user notifications: recipient reads" ON public.user_notifications;
CREATE POLICY "user notifications: recipient reads" ON public.user_notifications FOR SELECT TO authenticated
USING (recipient_user_id = public.current_profile_id());

DROP POLICY IF EXISTS "user notifications: recipient marks read" ON public.user_notifications;
CREATE POLICY "user notifications: recipient marks read" ON public.user_notifications FOR UPDATE TO authenticated
USING (recipient_user_id = public.current_profile_id())
WITH CHECK (recipient_user_id = public.current_profile_id());

CREATE OR REPLACE FUNCTION public.enqueue_user_notification(
  p_recipient_user_id UUID,
  p_actor_user_id UUID,
  p_workshop_id UUID,
  p_work_order_id UUID,
  p_event_key TEXT,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (
    recipient_user_id, actor_user_id, workshop_id, work_order_id,
    event_key, type, title, body, metadata
  ) VALUES (
    p_recipient_user_id, p_actor_user_id, p_workshop_id, p_work_order_id,
    p_event_key, p_type, p_title, p_body, p_metadata
  )
  ON CONFLICT (recipient_user_id, event_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_workshop_technicians(
  p_workshop_id UUID,
  p_actor_user_id UUID,
  p_work_order_id UUID,
  p_event_key TEXT,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient UUID;
BEGIN
  FOR v_recipient IN
    SELECT id FROM public.users
    WHERE workshop_id = p_workshop_id AND role = 'technician'
  LOOP
    IF v_recipient IS DISTINCT FROM p_actor_user_id THEN
      PERFORM public.enqueue_user_notification(
        v_recipient, p_actor_user_id, p_workshop_id, p_work_order_id,
        p_event_key || ':' || v_recipient::text, p_type, p_title, p_body, p_metadata
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_work_order_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(public.current_profile_id(), NEW.created_by);
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    PERFORM public.enqueue_user_notification(
      NEW.assigned_to, v_actor, NEW.workshop_id, NEW.id,
      'assignment:' || NEW.id::text || ':' || NEW.assigned_to::text || ':' || NEW.updated_at::text,
      'order_assigned', 'Nueva orden asignada',
      'Tienes asignada la orden ' || NEW.code || '. Revisa el diagnóstico y el alcance autorizado.',
      jsonb_build_object('order_code', NEW.code)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_assignment_notification ON public.work_orders;
CREATE TRIGGER work_order_assignment_notification
AFTER INSERT OR UPDATE OF assigned_to ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_work_order_assignment();

CREATE OR REPLACE FUNCTION public.invalidate_budget_approval_on_scope_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status = 'approved'
    AND (OLD.items IS DISTINCT FROM NEW.items OR OLD.total_cost IS DISTINCT FROM NEW.total_cost) THEN
    UPDATE public.budget_approvals
    SET status = 'revoked', updated_at = now()
    WHERE work_order_id = NEW.id AND status IN ('sent', 'approved', 'partial');

    UPDATE public.work_orders
    SET approval_required = true, approval_status = 'pending'
    WHERE id = NEW.id;

    INSERT INTO public.work_order_events (work_order_id, workshop_id, actor_user_id, event_type, detail)
    VALUES (NEW.id, NEW.workshop_id, public.current_profile_id(), 'approval_invalidated', jsonb_build_object('reason', 'scope_changed'));

    PERFORM public.notify_workshop_technicians(
      NEW.workshop_id, public.current_profile_id(), NEW.id,
      'approval-invalidated:' || NEW.id::text || ':' || NEW.updated_at::text,
      'approval_required', 'Nueva aprobación requerida',
      'Se modificaron rubros o precios de la orden ' || NEW.code || '. Envía una nueva aprobación al cliente.',
      jsonb_build_object('order_code', NEW.code)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_scope_invalidates_approval ON public.work_orders;
CREATE TRIGGER work_order_scope_invalidates_approval
AFTER UPDATE OF items, total_cost ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.invalidate_budget_approval_on_scope_change();

-- A status is a workflow decision, never a normal client-side field update.
-- Force the app to use transition_work_order_status(), which validates both
-- the actor and the permitted transition. Service-role Edge Functions retain
-- the ability to update commercial approval fields without changing status.
CREATE OR REPLACE FUNCTION public.prevent_direct_work_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
    AND auth.role() = 'authenticated'
    AND current_setting('app.workflow_transition', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Usa transition_work_order_status para cambiar el estado de una orden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_status_requires_transition ON public.work_orders;
CREATE TRIGGER work_order_status_requires_transition
BEFORE UPDATE OF status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_work_order_status_change();

CREATE OR REPLACE FUNCTION public.require_safe_initial_work_order_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated'
    AND (NEW.status <> 'pending'
      OR NEW.approval_required IS DISTINCT FROM false
      OR NEW.approval_status <> 'not_required') THEN
    RAISE EXCEPTION 'Las órdenes nuevas deben iniciar pendientes y sin una aprobación comercial activa';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_safe_initial_state ON public.work_orders;
CREATE TRIGGER work_order_safe_initial_state
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.require_safe_initial_work_order_state();

CREATE OR REPLACE FUNCTION public.prevent_direct_work_order_approval_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated'
    AND (NEW.approval_required IS DISTINCT FROM OLD.approval_required
      OR NEW.approval_status IS DISTINCT FROM OLD.approval_status) THEN
    RAISE EXCEPTION 'La aprobación comercial se actualiza únicamente mediante el flujo de presupuesto';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_approval_requires_budget_flow ON public.work_orders;
CREATE TRIGGER work_order_approval_requires_budget_flow
BEFORE UPDATE OF approval_required, approval_status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_work_order_approval_change();

-- Keep each order, vehicle and assigned mechanic inside the same workshop.
-- RLS limits who can see/write a row; this trigger also prevents a manager
-- from creating an accidental cross-workshop relationship through the API.
CREATE OR REPLACE FUNCTION public.validate_work_order_tenant_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_workshop UUID;
  v_assignee_workshop UUID;
  v_assignee_role public.user_role;
BEGIN
  IF NEW.workshop_id IS NULL THEN
    RAISE EXCEPTION 'Una orden debe pertenecer a una mecánica';
  END IF;

  SELECT workshop_id INTO v_vehicle_workshop FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_vehicle_workshop IS NULL OR v_vehicle_workshop IS DISTINCT FROM NEW.workshop_id THEN
    RAISE EXCEPTION 'El vehículo debe pertenecer a la misma mecánica que la orden';
  END IF;

  IF NEW.assigned_to IS NOT NULL THEN
    SELECT workshop_id, role INTO v_assignee_workshop, v_assignee_role FROM public.users WHERE id = NEW.assigned_to;
    IF v_assignee_role IS DISTINCT FROM 'mechanic' OR v_assignee_workshop IS DISTINCT FROM NEW.workshop_id THEN
      RAISE EXCEPTION 'La orden solo puede asignarse a un mecánico de la misma mecánica';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND auth.role() = 'authenticated'
    AND NEW.created_by IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'La orden debe registrar al usuario que la creó';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_order_tenant_references_valid ON public.work_orders;
CREATE TRIGGER work_order_tenant_references_valid
BEFORE INSERT OR UPDATE OF vehicle_id, workshop_id, assigned_to ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_work_order_tenant_references();

CREATE OR REPLACE FUNCTION public.transition_work_order_status(
  p_order_id UUID,
  p_next_status public.work_order_status
)
RETURNS public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := public.current_profile_id();
  v_actor_role public.user_role := public.current_user_role();
  v_order public.work_orders;
  v_updated public.work_orders;
BEGIN
  IF v_actor_id IS NULL OR v_actor_role IS NULL THEN RAISE EXCEPTION 'Sesión no autorizada'; END IF;

  SELECT * INTO v_order FROM public.work_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;

  IF v_actor_role = 'mechanic' THEN
    IF v_order.assigned_to IS DISTINCT FROM v_actor_id THEN RAISE EXCEPTION 'Solo puedes actualizar órdenes asignadas a ti'; END IF;
    IF v_order.status = 'pending' AND p_next_status = 'in_progress' THEN
      IF v_order.approval_status NOT IN ('not_required', 'approved') THEN
        RAISE EXCEPTION 'Esta orden espera la aprobación del cliente antes de iniciar';
      END IF;
    ELSIF v_order.status = 'in_progress' AND p_next_status = 'technical_review' THEN
      IF NOT EXISTS (SELECT 1 FROM public.work_logs WHERE work_order_id = v_order.id AND mechanic_id = v_actor_id) THEN
        RAISE EXCEPTION 'Registra al menos una actividad antes de enviar la orden a revisión';
      END IF;
    ELSE
      RAISE EXCEPTION 'El mecánico solo puede iniciar una orden pendiente o enviarla a revisión técnica';
    END IF;
  ELSIF v_actor_role IN ('admin', 'technician') THEN
    IF v_actor_role = 'technician' AND v_order.workshop_id IS DISTINCT FROM public.current_workshop_id() THEN
      RAISE EXCEPTION 'No puedes actualizar órdenes de otra mecánica';
    END IF;
    IF NOT (
      (v_order.status = 'pending' AND p_next_status IN ('in_progress', 'cancelled'))
      OR (v_order.status = 'in_progress' AND p_next_status IN ('technical_review', 'cancelled'))
      OR (v_order.status = 'technical_review' AND p_next_status IN ('in_progress', 'ready_for_delivery', 'cancelled'))
      OR (v_order.status = 'ready_for_delivery' AND p_next_status IN ('in_progress', 'completed'))
    ) THEN
      RAISE EXCEPTION 'Esta transición de estado no está permitida';
    END IF;
    IF v_order.status = 'pending' AND p_next_status = 'in_progress'
      AND v_order.approval_status NOT IN ('not_required', 'approved') THEN
      RAISE EXCEPTION 'Esta orden espera la aprobación del cliente antes de iniciar';
    END IF;
    IF v_order.status = 'technical_review' AND p_next_status = 'ready_for_delivery'
      AND v_order.approval_status NOT IN ('not_required', 'approved') THEN
      RAISE EXCEPTION 'Debes obtener la aprobación vigente del cliente antes de dejar la orden lista para entrega';
    END IF;
  ELSE
    RAISE EXCEPTION 'Rol no autorizado';
  END IF;

  PERFORM set_config('app.workflow_transition', 'true', true);
  UPDATE public.work_orders
  SET status = p_next_status,
      started_at = CASE WHEN p_next_status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
      completed_at = CASE WHEN p_next_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = p_order_id
  RETURNING * INTO v_updated;

  INSERT INTO public.work_order_events (work_order_id, workshop_id, actor_user_id, event_type, previous_status, next_status)
  VALUES (v_updated.id, v_updated.workshop_id, v_actor_id, 'status_changed', v_order.status::text, p_next_status::text);

  IF p_next_status = 'technical_review' THEN
    PERFORM public.notify_workshop_technicians(
      v_updated.workshop_id, v_actor_id, v_updated.id,
      'review:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'review_requested', 'Orden pendiente de revisión',
      'El mecánico terminó actividades en la orden ' || v_updated.code || '. Revisa los rubros y costos.',
      jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'in_progress' AND v_actor_role = 'mechanic' THEN
    PERFORM public.notify_workshop_technicians(
      v_updated.workshop_id, v_actor_id, v_updated.id,
      'started:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'work_started', 'Trabajo iniciado',
      'El mecánico inició la orden ' || v_updated.code || '.',
      jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'in_progress'
    AND v_order.status = 'technical_review'
    AND v_updated.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_updated.assigned_to, v_actor_id, v_updated.workshop_id, v_updated.id,
      'returned:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'work_returned', 'Correcciones requeridas',
      'El técnico devolvió la orden ' || v_updated.code || ' para continuar o corregir actividades.',
      jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'in_progress' AND v_updated.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_updated.assigned_to, v_actor_id, v_updated.workshop_id, v_updated.id,
      'authorized:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'work_started', 'Trabajo autorizado',
      'Puedes iniciar la orden ' || v_updated.code || '.', jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'ready_for_delivery' AND v_updated.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_updated.assigned_to, v_actor_id, v_updated.workshop_id, v_updated.id,
      'ready:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'ready_for_delivery', 'Orden lista para entrega',
      'La revisión técnica de la orden ' || v_updated.code || ' fue aprobada.', jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'completed' AND v_updated.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_updated.assigned_to, v_actor_id, v_updated.workshop_id, v_updated.id,
      'closed:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'order_closed', 'Orden cerrada',
      'La orden ' || v_updated.code || ' fue entregada y cerrada.', jsonb_build_object('order_code', v_updated.code)
    );
  ELSIF p_next_status = 'cancelled' AND v_updated.assigned_to IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_updated.assigned_to, v_actor_id, v_updated.workshop_id, v_updated.id,
      'cancelled:' || v_updated.id::text || ':' || v_updated.updated_at::text,
      'order_cancelled', 'Orden cancelada',
      'La orden ' || v_updated.code || ' fue cancelada.', jsonb_build_object('order_code', v_updated.code)
    );
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_work_order_status(UUID, public.work_order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_work_order_status(UUID, public.work_order_status) TO authenticated;

-- These helpers run only through database triggers, the transition RPC, or a
-- service-role Edge Function. They must never be callable from a browser.
REVOKE ALL ON FUNCTION public.enqueue_user_notification(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_workshop_technicians(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_work_order_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invalidate_budget_approval_on_scope_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_direct_work_order_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.require_safe_initial_work_order_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_direct_work_order_approval_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_work_order_tenant_references() FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'budget_approvals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_approvals;
  END IF;
END;
$$;
