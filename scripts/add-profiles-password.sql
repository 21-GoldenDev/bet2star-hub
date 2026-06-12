-- Run in Supabase SQL editor: store online user passwords for admin visibility.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password text;
