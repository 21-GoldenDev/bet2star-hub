ALTER TABLE games
ADD COLUMN IF NOT EXISTS game_name TEXT;

COMMENT ON COLUMN games.game_name IS
  'Optional display name for lotto games. Shown in week lists as "Game {week} {game_name}".';
