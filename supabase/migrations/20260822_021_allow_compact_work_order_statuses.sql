-- The original text CHECK predates the shared technician/mechanic workflow.
-- Accept both legacy records and the current compact operational states.

BEGIN;

ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS work_orders_status_check;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_status_check
  CHECK (status IN (
    'pending',
    'diagnosis',
    'waiting_approval',
    'approved',
    'in_progress',
    'technical_review',
    'ready_for_delivery',
    'completed',
    'cancelled'
  ));

COMMIT;
