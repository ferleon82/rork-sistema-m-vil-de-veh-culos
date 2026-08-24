-- Read-only report to decide the correct workshop for legacy clients.
-- Run this entire query in Supabase SQL Editor and share its single result.
SELECT
  'CLIENTE_SIN_TALLER' AS type,
  client.id::text AS id,
  client.name || ' · ' || client.phone AS detail,
  NULL::text AS workshop_id,
  NULL::text AS workshop_name
FROM public.clients AS client
WHERE client.workshop_id IS NULL

UNION ALL

SELECT
  'TALLER' AS type,
  workshop.id::text AS id,
  workshop.name AS detail,
  workshop.id::text AS workshop_id,
  workshop.name AS workshop_name
FROM public.workshops AS workshop

UNION ALL

SELECT
  'PERSONAL' AS type,
  profile.id::text AS id,
  profile.name || ' · ' || profile.email || ' · ' || profile.role::text AS detail,
  profile.workshop_id::text AS workshop_id,
  workshop.name AS workshop_name
FROM public.users AS profile
LEFT JOIN public.workshops AS workshop ON workshop.id = profile.workshop_id
WHERE profile.role IN ('technician', 'mechanic')

ORDER BY type, detail;
