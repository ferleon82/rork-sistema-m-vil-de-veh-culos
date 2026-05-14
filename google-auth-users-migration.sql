-- Migration: move Gesticar users from password-based access to Google/Supabase Auth invitations.
-- Run this once in Supabase SQL Editor before testing Google login.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE users
  ALTER COLUMN password DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'active', 'disabled'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

UPDATE users
SET status = 'pending'
WHERE status IS NULL;

-- Required Supabase Auth configuration:
-- 1. Authentication > Providers > Google: enable Google and add the Google OAuth client ID/secret.
-- 2. Authentication > URL Configuration > Redirect URLs: add rork-app://**.
-- 3. Create/invite each Gesticar user by Gmail in the users table before they try to sign in.
