CREATE SEQUENCE IF NOT EXISTS bet_number_seq;

DO $$
DECLARE
  max_num bigint := 0;
  table_max bigint;
BEGIN
  SELECT COALESCE(MAX(bet_id), 0) INTO table_max FROM bets_lotto;
  max_num := GREATEST(max_num, table_max);

  SELECT COALESCE(MAX(bet_id), 0) INTO table_max FROM bets_pools;
  max_num := GREATEST(max_num, table_max);

  SELECT COALESCE(MAX(number), 0) INTO table_max FROM bets_sport;
  max_num := GREATEST(max_num, table_max);

  SELECT COALESCE(MAX(number), 0) INTO table_max FROM bets_sports_draw;
  max_num := GREATEST(max_num, table_max);

  PERFORM setval('bet_number_seq', max_num, max_num > 0);
END $$;

CREATE OR REPLACE FUNCTION next_bet_number()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('bet_number_seq');
$$;

GRANT EXECUTE ON FUNCTION next_bet_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_bet_number() TO service_role;
