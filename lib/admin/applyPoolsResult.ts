import type { SupabaseClient } from "@supabase/supabase-js";
import { TurboPrize, computePoolsAward } from "@/lib/helpers";
import { getGamePrizeException } from "@/lib/admin/syncTerminalPrizesFromGame";
import { Prize } from "@/lib/types/prize";

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function applyPoolsResult(
  supabase: SupabaseClient,
  gameId: string,
  validResult: string[],
): Promise<{ error: string | null; balanceUpdates: number }> {
  const { data: gameRow, error: gameFetchError } = await supabase
    .from("games")
    .select("prize_ids")
    .eq("id", gameId)
    .single();

  if (gameFetchError) {
    return { error: gameFetchError.message, balanceUpdates: 0 };
  }

  const { error: updateError } = await supabase
    .from("games")
    .update({ results: validResult })
    .eq("id", gameId);

  if (updateError) {
    return { error: updateError.message, balanceUpdates: 0 };
  }

  const { data: bets, error: betsError } = await supabase
    .from("bets_pools")
    .select("id, bet_id, gameType, staked, under, matches, prize_id, player, status, award")
    .eq("game_id", gameId);

  if (betsError) {
    return { error: betsError.message, balanceUpdates: 0 };
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
      return { error: prizesError.message, balanceUpdates: 0 };
    }

    prizeMap = (prizesData || []).reduce((acc: Record<string, Prize>, prize: Prize) => {
      acc[prize.id] = prize;
      return acc;
    }, {});
  }

  const { data: turboPrizeData } = await supabase.from("turbo_prize").select("*").single();

  type BetUpdate = {
    id: string;
    award: number;
    player: string | null;
    betId: number;
    delta: number;
  };

  const updates: BetUpdate[] = (bets || []).map(
    (bet: Record<string, unknown> & { id: string; prize_id?: string; player?: string | null; award?: number; bet_id?: number }) => {
      const prize = bet.prize_id ? prizeMap[bet.prize_id] ?? null : null;
      const resultException = bet.prize_id
        ? getGamePrizeException(gameRow?.prize_ids, bet.prize_id)
        : undefined;
      const oldAward = Number(bet.award) || 0;
      const award = computePoolsAward(
        bet,
        prize,
        validResult,
        turboPrizeData as TurboPrize | null,
        resultException,
      );
      const delta = award - oldAward;
      return {
        id: bet.id,
        award,
        player: bet.player ?? null,
        betId: Number(bet.bet_id) || 0,
        delta,
      };
    },
  );

  const nonNullUpdates = updates.filter((u) => Number.isFinite(u.award));
  if (nonNullUpdates.length > 0) {
    const updateChunks = chunkArray(nonNullUpdates, 50);
    for (const chunk of updateChunks) {
      const results = await Promise.all(
        chunk.map((u) => supabase.from("bets_pools").update({ award: u.award }).eq("id", u.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        return { error: failed.error.message, balanceUpdates: 0 };
      }
    }
  }

  const playerDeltas = new Map<string, number>();
  const winTransactions: Array<{
    user_id: string;
    amount: number;
    betId: number;
  }> = [];

  for (const update of nonNullUpdates) {
    if (!update.player || update.delta === 0) continue;
    playerDeltas.set(update.player, (playerDeltas.get(update.player) || 0) + update.delta);
    if (update.delta > 0) {
      winTransactions.push({
        user_id: update.player,
        amount: update.delta,
        betId: update.betId,
      });
    }
  }

  if (playerDeltas.size === 0) {
    return { error: null, balanceUpdates: 0 };
  }

  const playerIds = Array.from(playerDeltas.keys());
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, user_id, balance")
    .in("user_id", playerIds);

  if (profilesError) {
    return { error: profilesError.message, balanceUpdates: 0 };
  }

  const profileByUserId = new Map(
    (profiles || []).map((p: { id: string; user_id: string; balance?: number }) => [p.user_id, p]),
  );

  let balanceUpdates = 0;

  for (const [userId, delta] of playerDeltas) {
    const profile = profileByUserId.get(userId);
    if (!profile) continue;

    const currentBalance = Number(profile.balance) || 0;
    const newBalance = currentBalance + delta;

    const { error: balanceError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    if (balanceError) {
      return { error: balanceError.message, balanceUpdates };
    }

    balanceUpdates += 1;
  }

  const profileIdByUserId = new Map(
    (profiles || []).map((p: { id: string; user_id: string }) => [p.user_id, p.id]),
  );

  const txInserts = winTransactions
    .filter((tx) => profileIdByUserId.has(tx.user_id))
    .map((tx) => ({
      user_id: tx.user_id,
      profile_id: profileIdByUserId.get(tx.user_id)!,
      type: "winning",
      amount: tx.amount,
      status: "completed",
      reference: `WIN-POOLS-${tx.betId}`,
      payment_method: "balance",
      metadata: {
        bet_type: "pools",
        game_id: gameId,
        bet_number: tx.betId,
      },
    }));

  if (txInserts.length > 0) {
    const { error: txError } = await supabase.from("transactions").insert(txInserts);
    if (txError) {
      console.error("Error recording winning transactions:", txError);
    }
  }

  return { error: null, balanceUpdates };
}
