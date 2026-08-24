-- Repair migration 017 on databases where work_orders.status is TEXT while
-- work_order_events was initially created with the legacy enum type.
-- Existing activities and event rows are preserved.

BEGIN;

ALTER TABLE public.work_order_events
  ALTER COLUMN previous_status TYPE TEXT USING previous_status::text,
  ALTER COLUMN next_status TYPE TEXT USING next_status::text;

COMMIT;
