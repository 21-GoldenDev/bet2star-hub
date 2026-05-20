-- Platform-wide settings (run in Supabase SQL editor if not using migrations)
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'general',
  max_bet_amount NUMERIC NOT NULL DEFAULT 100000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id, max_bet_amount)
VALUES ('general', 100000)
ON CONFLICT (id) DO NOTHING;
