import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "@/lib/types/gameMode";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";

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
      throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message);
    }

    const game = data as ActiveGameRow | null;
    if (!game) {
      throw new PosError(
        POS_ERROR_CODES.GAME_NOT_FOUND,
        `${type} game not found`,
        { game_id: gameId, type },
      );
    }

    if (game.start_time > now || game.end_time < now) {
      throw new PosError(
        POS_ERROR_CODES.GAME_NOT_ACTIVE,
        `${type} game is not active`,
        { game_id: gameId, type },
      );
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
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const game = (data?.[0] as ActiveGameRow | undefined) ?? null;
  if (!game) {
    throw new PosError(
      POS_ERROR_CODES.NO_ACTIVE_GAME,
      `No active ${type} game`,
      { type },
    );
  }

  return game;
}
