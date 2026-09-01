ALTER TABLE matches
ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'pools';

COMMENT ON COLUMN matches.game_type IS
  'Pools product that owns this fixture row: pools or daily_pools.';

UPDATE matches
SET game_type = 'pools'
WHERE game_type IS NULL OR game_type = '';

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname
  INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'matches'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) IN (
      'UNIQUE (week, number)',
      'UNIQUE (number, week)'
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE matches DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS matches_week_number_game_type_key
  ON matches (week, number, game_type);
