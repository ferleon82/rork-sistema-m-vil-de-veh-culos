-- Execute after 20260821_013_work_order_workflow_statuses.sql.
-- A single database transition point keeps the technician and mechanic views
-- synchronized and prevents unauthorized state changes through direct API use.

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
  IF v_actor_id IS NULL OR v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Sesión no autorizada';
  END IF;

  SELECT * INTO v_order
  FROM public.work_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  IF v_actor_role = 'mechanic' THEN
    IF v_order.assigned_to IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION 'Solo puedes actualizar órdenes asignadas a ti';
    END IF;

    IF v_order.status = 'pending' AND p_next_status = 'in_progress' THEN
      NULL; -- The mechanic may begin any assigned pending order.
    ELSIF v_order.status = 'in_progress' AND p_next_status = 'technical_review' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.work_logs
        WHERE work_order_id = v_order.id AND mechanic_id = v_actor_id
      ) THEN
        RAISE EXCEPTION 'Registra al menos una actividad antes de enviar la orden a revisión';
      END IF;
    ELSE
      RAISE EXCEPTION 'El mecánico puede iniciar una orden pendiente o enviarla a revisión técnica';
    END IF;
  ELSIF v_actor_role IN ('admin', 'technician') THEN
    IF v_actor_role = 'technician' AND v_order.workshop_id IS DISTINCT FROM public.current_workshop_id() THEN
      RAISE EXCEPTION 'No puedes actualizar órdenes de otra mecánica';
    END IF;

    IF NOT (
      (v_order.status = 'pending' AND p_next_status IN ('diagnosis', 'cancelled'))
      OR (v_order.status = 'diagnosis' AND p_next_status IN ('pending', 'waiting_approval', 'cancelled'))
      OR (v_order.status = 'waiting_approval' AND p_next_status IN ('diagnosis', 'in_progress', 'cancelled'))
      OR (v_order.status = 'in_progress' AND p_next_status IN ('waiting_approval', 'technical_review', 'cancelled'))
      OR (v_order.status = 'technical_review' AND p_next_status IN ('in_progress', 'ready_for_delivery', 'cancelled'))
      OR (v_order.status = 'ready_for_delivery' AND p_next_status IN ('in_progress', 'completed'))
    ) THEN
      RAISE EXCEPTION 'Esta transición de estado no está permitida';
    END IF;
  ELSE
    RAISE EXCEPTION 'Rol no autorizado';
  END IF;

  UPDATE public.work_orders
  SET
    status = p_next_status,
    started_at = CASE
      WHEN p_next_status = 'in_progress' AND started_at IS NULL THEN now()
      ELSE started_at
    END,
    completed_at = CASE
      WHEN p_next_status = 'completed' THEN now()
      ELSE completed_at
    END
  WHERE id = p_order_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_work_order_status(UUID, public.work_order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_work_order_status(UUID, public.work_order_status) TO authenticated;
