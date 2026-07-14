import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "@/lib/types/gameMode";

export type ActiveGameRow = {
  id: string;
  start_time: string;
  end_time: string;
  week: number | null;
  type: string;
  visible_numbers?: number[] | null;
  prize_ids?: unknown;
  results?: unknown;
};

export async function resolveActiveGame(
  supabase: SupabaseClient,
  type: GameType,
  gameId?: string,
): Promise<ActiveGameRow> {
  const now = new Date().toISOString();

  if (gameId) {
    const { data, error } = await supabase
      .from("games")
      .select("id, start_time, end_time, week, type, visible_numbers, prize_ids, results")
      .eq("id", gameId)
      .eq("type", type)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const game = data as ActiveGameRow | null;
    if (!game) {
      throw new Error(`${type} game not found`);
    }

    if (game.start_time > now || game.end_time < now) {
      throw new Error(`${type} game is not active`);
    }

    return game;
  }

  const { data, error } = await supabase
    .from("games")
    .select("id, start_time, end_time, week, type, visible_numbers, prize_ids, results")
    .eq("type", type)
    .lte("start_time", now)
    .gte("end_time", now)
    .order("start_time", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const game = (data?.[0] as ActiveGameRow | undefined) ?? null;
  if (!game) {
    throw new Error(`No active ${type} game`);
  }

  return game;
}
