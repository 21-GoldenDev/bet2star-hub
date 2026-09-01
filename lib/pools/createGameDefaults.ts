import type { SupabaseClient } from "@supabase/supabase-js";
import type { PoolsLikeGameType } from "@/lib/pools/gameType";

/** Used when creating the first pools-like week and nothing exists to copy from. */
export const POOLS_DEFAULT_MAX_STAKE = {
  "1": 10000,
  "2": 50000,
  "3": 100000,
};

export type PreviousPoolsLikeGame = {
  week: number;
  type: string;
  max_stake: unknown;
  max_prize: unknown;
  visible_numbers: number[] | null;
  void_window_minutes: number | null;
  prize_ids: unknown;
};

const PREVIOUS_GAME_SELECT =
  "week, type, max_stake, max_prize, visible_numbers, void_window_minutes, prize_ids";

async function findLatestGameByType(
  supabase: SupabaseClient,
  type: string,
  filters?: { startTimeBefore?: string; weekBefore?: number },
): Promise<PreviousPoolsLikeGame | null> {
  let query = supabase
    .from("games")
    .select(PREVIOUS_GAME_SELECT)
    .eq("type", type);

  if (filters?.startTimeBefore) {
    query = query
      .lt("start_time", filters.startTimeBefore)
      .order("start_time", { ascending: false });
  } else if (filters?.weekBefore != null) {
    query = query
      .lt("week", filters.weekBefore)
      .order("week", { ascending: false });
  } else {
    query = query.order("start_time", { ascending: false });
  }

  const { data } = await query.limit(1).maybeSingle();
  return data;
}

/**
 * Previous week for a new pools / daily_pools game:
 * 1. Same type with an earlier start time
 * 2. Same type with a smaller week number
 * 3. Daily/mid-week only: latest Pools game (so the first mid-week week
 *    inherits matches, max stakes, and prizes)
 */
export async function resolvePreviousPoolsLikeGame(
  supabase: SupabaseClient,
  type: PoolsLikeGameType,
  startTime: string,
  week: number,
): Promise<PreviousPoolsLikeGame | null> {
  const byStart = await findLatestGameByType(supabase, type, {
    startTimeBefore: startTime,
  });
  if (byStart) return byStart;

  const byWeek = await findLatestGameByType(supabase, type, {
    weekBefore: week,
  });
  if (byWeek) return byWeek;

  if (type === "daily_pools") {
    return findLatestGameByType(supabase, "pools");
  }

  return null;
}

export function resolvePoolsLikeMaxStake(previousMaxStake: unknown): typeof POOLS_DEFAULT_MAX_STAKE | unknown {
  if (previousMaxStake && typeof previousMaxStake === "object" && !Array.isArray(previousMaxStake)) {
    if (Object.keys(previousMaxStake as object).length > 0) {
      return previousMaxStake;
    }
  }
  return POOLS_DEFAULT_MAX_STAKE;
}

export type PoolsMatchCopy = {
  number: number;
  home: string;
  away: string;
  status: "enable" | "disable";
};

async function fetchMatchTemplates(
  supabase: SupabaseClient,
  week: number,
  gameType: PoolsLikeGameType,
): Promise<PoolsMatchCopy[]> {
  const { data } = await supabase
    .from("matches")
    .select("number, home, away, status")
    .eq("week", week)
    .eq("game_type", gameType)
    .order("number", { ascending: true });

  return (data || []).map((match) => ({
    number: match.number,
    home: match.home,
    away: match.away,
    status: match.status === "disable" ? ("disable" as const) : ("enable" as const),
  }));
}

export function matchSourceGameType(
  previousGame: PreviousPoolsLikeGame | null,
  type: PoolsLikeGameType,
): PoolsLikeGameType {
  return previousGame?.type === "pools" || previousGame?.type === "daily_pools"
    ? previousGame.type
    : type;
}

export async function loadPoolsMatchTemplates(
  supabase: SupabaseClient,
  type: PoolsLikeGameType,
  previousGame: PreviousPoolsLikeGame | null,
): Promise<PoolsMatchCopy[]> {
  if (previousGame) {
    const sourceType = matchSourceGameType(previousGame, type);
    const fromPrevious = await fetchMatchTemplates(supabase, previousGame.week, sourceType);
    if (fromPrevious.length > 0) return fromPrevious;

    if (sourceType !== "pools") {
      const fromPoolsSameWeek = await fetchMatchTemplates(supabase, previousGame.week, "pools");
      if (fromPoolsSameWeek.length > 0) return fromPoolsSameWeek;
    }
  }

  if (type === "daily_pools") {
    const poolsGame = await findLatestGameByType(supabase, "pools");
    if (poolsGame) {
      return fetchMatchTemplates(supabase, poolsGame.week, "pools");
    }
  }

  return [];
}
