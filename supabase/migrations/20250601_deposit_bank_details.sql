-- Storage bucket for platform config files (deposit bank details, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-config',
  'platform-config',
  false,
  1048576,
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Optional DB columns fallback (used if storage is unavailable)
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS deposit_bank_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_account_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_account_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_note TEXT NOT NULL DEFAULT '';
