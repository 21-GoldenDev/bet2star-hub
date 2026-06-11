-- Allow authenticated clients to receive Realtime events for games/matches.
-- Only applies when RLS is already enabled on these tables.

do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'games'
      and rowsecurity = true
  ) and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'games'
      and policyname = 'authenticated_read_games'
  ) then
    create policy authenticated_read_games
      on public.games
      for select
      to authenticated
      using (true);
  end if;

  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'matches'
      and rowsecurity = true
  ) and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'authenticated_read_matches'
  ) then
    create policy authenticated_read_matches
      on public.matches
      for select
      to authenticated
      using (true);
  end if;
end $$;
