-- Phase 1: replace application-managed passwords with Supabase Auth.
-- Existing Google identities in Authentication > Users are linked to profiles by email.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

UPDATE public.users AS profile
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE lower(profile.email) = lower(auth_user.email)
  AND profile.auth_user_id IS NULL;

-- Password hashes belong exclusively to Supabase Auth. Never retain the old clear-text column.
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

COMMIT;
