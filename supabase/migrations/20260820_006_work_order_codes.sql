-- Generate work-order codes atomically in PostgreSQL, never in the mobile app.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.work_order_code_seq;

-- Continue after the highest existing OT-YYYY-NNN code. If the table is empty,
-- nextval will return 1.
DO $$
DECLARE
  last_number BIGINT;
BEGIN
  SELECT MAX((regexp_match(code, '^OT-[0-9]{4}-([0-9]+)$'))[1]::BIGINT)
    INTO last_number
  FROM public.work_orders;

  PERFORM setval(
    'public.work_order_code_seq',
    COALESCE(last_number, 1),
    last_number IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_work_order_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.code := format(
    'OT-%s-%s',
    to_char(COALESCE(NEW.created_at, NOW()), 'YYYY'),
    lpad(nextval('public.work_order_code_seq')::text, 5, '0')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_work_order_code ON public.work_orders;
CREATE TRIGGER assign_work_order_code
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.assign_work_order_code();

COMMIT;
