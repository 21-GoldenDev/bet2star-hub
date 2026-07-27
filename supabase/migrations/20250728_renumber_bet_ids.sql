-- Renumber all existing bets to globally unique sequential IDs (1, 2, 3, ...)
-- ordered by bet_time, then id. Wrapped in DO block for Supabase SQL editor.

DO $$
DECLARE
  max_num bigint;
BEGIN
  CREATE TEMP TABLE bet_id_remap ON COMMIT DROP AS
  SELECT
    source_table,
    id,
    ROW_NUMBER() OVER (ORDER BY bet_time ASC NULLS LAST, id ASC) AS new_bet_number
  FROM (
    SELECT 'bets_lotto' AS source_table, id, bet_time FROM bets_lotto
    UNION ALL
    SELECT 'bets_pools', id, bet_time FROM bets_pools
    UNION ALL
    SELECT 'bets_sport', id, bet_time FROM bets_sport
    UNION ALL
    SELECT 'bets_sports_draw', id, bet_time FROM bets_sports_draw
  ) all_bets;

  -- Phase 1: negative values avoid collisions during update
  UPDATE bets_lotto b
  SET bet_id = -r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_lotto' AND r.id = b.id;

  UPDATE bets_pools b
  SET bet_id = -r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_pools' AND r.id = b.id;

  UPDATE bets_sport b
  SET number = -r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_sport' AND r.id = b.id;

  UPDATE bets_sports_draw b
  SET number = -r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_sports_draw' AND r.id = b.id;

  -- Phase 2: final positive numbers
  UPDATE bets_lotto b
  SET bet_id = r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_lotto' AND r.id = b.id;

  UPDATE bets_pools b
  SET bet_id = r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_pools' AND r.id = b.id;

  UPDATE bets_sport b
  SET number = r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_sport' AND r.id = b.id;

  UPDATE bets_sports_draw b
  SET number = r.new_bet_number
  FROM bet_id_remap r
  WHERE r.source_table = 'bets_sports_draw' AND r.id = b.id;

  SELECT COALESCE(MAX(new_bet_number), 0) INTO max_num FROM bet_id_remap;

  PERFORM setval(
    'bet_number_seq',
    max_num,
    max_num > 0
  );
END $$;
