import type { SupabaseClient } from "@supabase/supabase-js";
import { computePoolsAward, TurboPrize } from "@/lib/helpers";
import { getGamePrizeException } from "@/lib/admin/syncTerminalPrizesFromGame";
import { Prize } from "@/lib/types/prize";

export async function recomputePoolsAwardsForGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<{ error: string | null }> {
  const { data: gameRow, error: gameError } = await supabase
    .from("games")
    .select("results, prize_ids")
    .eq("id", gameId)
    .single();

  if (gameError) {
    return { error: gameError.message };
  }

  const weekResult = (gameRow?.results as string[] | null) || [];
  if (!Array.isArray(weekResult) || weekResult.length === 0) {
    return { error: null };
  }

  const validResult = weekResult.filter((num) => typeof num === "string");

  const { data: bets, error: betsError } = await supabase
    .from("bets_pools")
    .select("id, gameType, staked, under, matches, prize_id, player, status")
    .eq("game_id", gameId);

  if (betsError) {
    return { error: betsError.message };
  }

  const uniquePrizeIds = Array.from(
    new Set((bets || []).map((b: { prize_id?: string }) => b.prize_id).filter((id): id is string => !!id)),
  );

  let prizeMap: Record<string, Prize> = {};
  if (uniquePrizeIds.length > 0) {
    const { data: prizesData, error: prizesError } = await supabase
      .from("prize")
      .select("id, name, data")
      .in("id", uniquePrizeIds);

    if (prizesError) {
      return { error: prizesError.message };
    }

    prizeMap = (prizesData || []).reduce((acc: Record<string, Prize>, prize: Prize) => {
      acc[prize.id] = prize;
      return acc;
    }, {});
  }

  const { data: turboPrizeData } = await supabase.from("turbo_prize").select("*").single();

  const updates = (bets || []).map((bet: Record<string, unknown> & { id: string; prize_id?: string }) => {
    const prize = bet.prize_id ? prizeMap[bet.prize_id] ?? null : null;
    const resultException = bet.prize_id
      ? getGamePrizeException(gameRow?.prize_ids, bet.prize_id)
      : undefined;
    const award = computePoolsAward(
      bet,
      prize,
      validResult,
      turboPrizeData as TurboPrize | null,
      resultException,
    );
    return { id: bet.id, award };
  });

  const nonNullUpdates = updates.filter((u) => Number.isFinite(u.award));
  if (nonNullUpdates.length > 0) {
    const results = await Promise.all(
      nonNullUpdates.map((u) =>
        supabase.from("bets_pools").update({ award: u.award }).eq("id", u.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return { error: failed.error.message };
    }
  }

  return { error: null };
}
