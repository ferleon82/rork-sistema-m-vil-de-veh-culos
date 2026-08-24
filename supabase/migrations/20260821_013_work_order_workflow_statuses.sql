-- Phase 2: shared operational workflow for technicians and mechanics.
-- PostgreSQL requires newly-added enum values to be committed before a later
-- migration can use them in functions or policies.

ALTER TYPE public.work_order_status ADD VALUE IF NOT EXISTS 'diagnosis' AFTER 'pending';
ALTER TYPE public.work_order_status ADD VALUE IF NOT EXISTS 'technical_review';
ALTER TYPE public.work_order_status ADD VALUE IF NOT EXISTS 'ready_for_delivery';

-- "approved" was the former intermediate status. Approved orders now enter
-- the operational phase, represented by "in_progress".
UPDATE public.work_orders
SET status = 'in_progress'
WHERE status = 'approved';
