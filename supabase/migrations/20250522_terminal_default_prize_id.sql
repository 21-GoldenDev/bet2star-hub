-- Default prize for terminal betting UI (must be one of active rows in terminal.prizes).
ALTER TABLE terminal
  ADD COLUMN IF NOT EXISTS default_prize_id UUID NULL;

COMMENT ON COLUMN terminal.default_prize_id IS 'prize_id used as the default selection on this terminal';
