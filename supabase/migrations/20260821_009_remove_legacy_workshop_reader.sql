-- Remove the final legacy workshop reader policy.
-- Access is defined exclusively by "workshops: permitted readers".
BEGIN;

DROP POLICY IF EXISTS "Usuarios ven su propio taller" ON public.workshops;

COMMIT;
