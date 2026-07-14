import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamePrizeException } from "@/lib/admin/syncTerminalPrizesFromGame";
import { computePoolsAward, computeLottoApl } from "@/lib/helpers";
import { dedupePoolsMatchesByNumber } from "@/lib/pools/defaultMatches";
import {
  getDefaultTerminalPrizeId,
  isTerminalPrizeActive,
  normalizeTerminalPrizeEntries,
} from "@/lib/terminals/terminalPrize";
import type { GameModeType } from "@/lib/types/gameMode";
import type { Prize } from "@/lib/types/prize";
import { resolveActiveGame } from "@/lib/pos/resolveActiveGame";
import { deductTerminalCredit, resolvePosTerminal } from "@/lib/pos/resolvePosTerminal";

export type PlacePoolsPosBetInput = {
  tsn: string;
  gameId?: string;
  gameMode: GameModeType;
  stake: number;
  under: number[];
  matches: string[] | Record<string, string[]>;
  grouping?: {
    selectedUs: Array<{ id: string; u: number }>;
    groupSelections: Record<string, string[]>;
  };
  twobanker?: {
    groupAU: number;
    groupAMatches: string[];
    totalUnder: number;
  };
  onebanker?: {
    groupAMatches: string[];
  };
  prizeId?: string;
};

export type PlacePoolsPosBetResult = {
  apl: number;
  stake: number;
  gameMode: GameModeType;
  gameId: string;
  betId: string;
  betNumber: number;
  tsn: string;
  terminalId: string;
  remainingCredit: number;
  award: number;
};

async function loadPrize(supabase: SupabaseClient, prizeId?: string): Promise<Prize | null> {
  if (!prizeId) return null;
  const { data, error } = await supabase.from("prize").select("id, name, data").eq("id", prizeId).single();
  if (error || !data) return null;
  return data as Prize;
}

async function computeAward(
  supabase: SupabaseClient,
  gameId: string,
  bet: Record<string, unknown>,
  prizeId?: string,
): Promise<number> {
  const [{ data: gameData }, prize, turboPrize] = await Promise.all([
    supabase.from("games").select("results, prize_ids").eq("id", gameId).single(),
    loadPrize(supabase, prizeId),
    supabase.from("turbo_prize").select("*").single().then((r) => r.data),
  ]);

  const results = (gameData?.results as string[]) || [];
  if (!Array.isArray(results) || results.length === 0) return 0;

  const resultException = prizeId
    ? getGamePrizeException(gameData?.prize_ids, prizeId)
    : undefined;
  const award = computePoolsAward(bet, prize, results, turboPrize, resultException);
  return Number.isFinite(award) ? award : 0;
}

function shapeMatches(
  input: PlacePoolsPosBetInput,
  visibleMatches: string[],
): string[] | Record<string, string[]> {
  const { gameMode, matches, grouping, twobanker, onebanker } = input;

  if (gameMode === "nap_perm" || gameMode === "turbo" || gameMode === "under1" || gameMode === "under2") {
    if (!Array.isArray(matches)) {
      throw new Error("matches must be an array for this game mode");
    }
    return matches;
  }

  if (gameMode === "grouping") {
    if (grouping?.selectedUs?.length && grouping.groupSelections) {
      const numbersObj: Record<string, string[]> = {};
      for (const sel of grouping.selectedUs) {
        numbersObj[`${sel.u}-${sel.id}`] = grouping.groupSelections[sel.id] || [];
      }
      return numbersObj;
    }
    if (matches && typeof matches === "object" && !Array.isArray(matches)) {
      return matches;
    }
    throw new Error("Grouping mode requires grouping data or matches object");
  }

  if (gameMode === "two_banker") {
    if (twobanker?.groupAMatches) {
      const groupBU = twobanker.totalUnder - twobanker.groupAU;
      const groupBMatches = visibleMatches.filter((n) => !twobanker.groupAMatches.includes(n));
      return {
        [`${twobanker.groupAU}-groupA`]: twobanker.groupAMatches,
        [`${groupBU}-groupB`]: groupBMatches,
      };
    }
    if (matches && typeof matches === "object" && !Array.isArray(matches)) {
      return matches;
    }
    throw new Error("two_banker mode requires twobanker data or matches object");
  }

  if (gameMode === "one_banker") {
    const groupA = onebanker?.groupAMatches
      || (Array.isArray(matches) ? matches : null);
    if (groupA && groupA.length > 0) {
      const groupBMatches = visibleMatches.filter((n) => !groupA.includes(n));
      return {
        "1-groupA": groupA,
        "1-groupB": groupBMatches,
      };
    }
    if (matches && typeof matches === "object" && !Array.isArray(matches)) {
      return matches;
    }
    throw new Error("one_banker mode requires onebanker data or matches");
  }

  throw new Error(`Unsupported game mode: ${gameMode}`);
}

export async function placePoolsPosBet(
  supabase: SupabaseClient,
  input: PlacePoolsPosBetInput,
): Promise<PlacePoolsPosBetResult> {
  const { tsn, gameId, gameMode, stake, under, prizeId } = input;

  const terminal = await resolvePosTerminal(supabase, tsn, "pools", stake);
  const game = await resolveActiveGame(supabase, "pools", gameId);
  const resolvedGameId = game.id;

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "enable")
    .eq("week", game.week)
    .order("number", { ascending: true });

  if (matchError) {
    throw new Error(matchError.message);
  }

  const visibleMatches =
    dedupePoolsMatchesByNumber(matchData || []).map((m) => String(m.number)) ||
    Array.from({ length: 49 }, (_, i) => String(i + 1));

  const terminalPrizes = normalizeTerminalPrizeEntries(terminal.prizes);
  let resolvedPrizeId = prizeId || getDefaultTerminalPrizeId(terminal.prizes) || undefined;

  if (resolvedPrizeId) {
    const prizeEntry = terminalPrizes.find((p) => p.prize_id === resolvedPrizeId);
    if (prizeEntry && !isTerminalPrizeActive(prizeEntry)) {
      throw new Error("Selected prize is inactive on this terminal");
    }
  }

  const matchesObj = shapeMatches(input, visibleMatches);
  const apl = computeLottoApl(gameMode, stake, under, matchesObj as never);

  const { data: existingBets, error: countError } = await supabase
    .from("bets_pools")
    .select("bet_id")
    .eq("game_id", resolvedGameId)
    .order("bet_id", { ascending: false })
    .limit(1);

  if (countError) {
    throw new Error(countError.message);
  }

  const nextNumber = existingBets?.length ? existingBets[0].bet_id + 1 : 1;
  const now = new Date().toISOString();

  const { data: bet, error: insertError } = await supabase
    .from("bets_pools")
    .insert({
      game_id: resolvedGameId,
      bet_id: nextNumber,
      terminal: terminal.id,
      player: null,
      matches: matchesObj,
      gameType: gameMode,
      under,
      staked: stake,
      bet_time: now,
      prize_id: resolvedPrizeId ?? null,
      award: 0,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !bet) {
    throw new Error(insertError?.message || "Failed to save bet");
  }

  const remainingCredit = await deductTerminalCredit(
    supabase,
    terminal.id,
    terminal.credit_limit,
    stake,
    async () => {
      await supabase.from("bets_pools").delete().eq("id", bet.id);
    },
  );

  const award = await computeAward(supabase, resolvedGameId, bet, resolvedPrizeId);
  if (award > 0) {
    await supabase.from("bets_pools").update({ award }).eq("id", bet.id);
  }

  return {
    apl: Math.round(apl * 100) / 100,
    stake,
    gameMode,
    gameId: resolvedGameId,
    betId: bet.id,
    betNumber: nextNumber,
    tsn: terminal.serial_number,
    terminalId: terminal.id,
    remainingCredit,
    award,
  };
}
