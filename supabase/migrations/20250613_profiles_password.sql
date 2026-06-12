-- Store online user passwords for admin visibility (matches staff/agent pattern).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password text;
