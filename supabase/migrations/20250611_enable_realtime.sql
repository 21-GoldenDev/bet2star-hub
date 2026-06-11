-- Enable Supabase Realtime for tables that admin updates and user pages read.
-- Run in Supabase SQL Editor if not applied via migration tooling.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'games',
    'sports',
    'matches',
    'prize',
    'platform_settings',
    'bets_lotto',
    'bets_pools',
    'bets_sport',
    'bets_sports_draw'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
