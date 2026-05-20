-- Run in Supabase SQL editor: per-game void window for admin/staff/agent void actions.
ALTER TABLE games
ADD COLUMN IF NOT EXISTS void_window_minutes integer;

COMMENT ON COLUMN games.void_window_minutes IS
  'Minutes after bet_time during which admins, staff, and agents may void bets. NULL = no time limit.';
