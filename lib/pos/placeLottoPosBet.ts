import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLottoAward, computeLottoApl } from "@/lib/helpers";
import {
  getDefaultTerminalPrizeId,
  isTerminalPrizeActive,
  normalizeTerminalPrizeEntries,
} from "@/lib/terminals/terminalPrize";
import type { GameModeType } from "@/lib/types/gameMode";
import type { Prize } from "@/lib/types/prize";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";
import { resolveActiveGame } from "@/lib/pos/resolveActiveGame";
import { deductTerminalCredit, resolvePosTerminal } from "@/lib/pos/resolvePosTerminal";

export type PlaceLottoPosBetInput = {
  tsn: string;
  gameId?: string;
  gameMode: GameModeType;
  stake: number;
  under: number[];
  numbers?: number[] | Record<string, number[]>;
  grouping?: {
    selectedUs: Array<{ id: string; u: number }>;
    groupSelections: Record<string, number[]>;
  };
  twobanker?: {
    groupAU: number;
    groupANumbers: number[];
    totalUnder: number;
  };
  onebanker?: {
    groupANumbers: number[];
  };
  prizeId?: string;
};

export type PlaceLottoPosBetResult = {
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
    supabase.from("games").select("results").eq("id", gameId).single(),
    loadPrize(supabase, prizeId),
    supabase.from("turbo_prize").select("*").single().then((r) => r.data),
  ]);

  const results = (gameData?.results as number[]) || [];
  if (!Array.isArray(results) || results.length === 0) return 0;

  const award = computeLottoAward(bet, prize, results, turboPrize);
  return Number.isFinite(award) ? award : 0;
}

function shapeNumbers(
  input: PlaceLottoPosBetInput,
  visibleNumbers: number[],
): number[] | Record<string, number[]> {
  const { gameMode, numbers, grouping, twobanker, onebanker } = input;

  if (gameMode === "nap_perm" || gameMode === "turbo" || gameMode === "under1" || gameMode === "under2") {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_SELECTIONS,
        "numbers must be a non-empty array for this game mode",
      );
    }
    return numbers;
  }

  if (gameMode === "grouping") {
    if (grouping?.selectedUs?.length && grouping.groupSelections) {
      const numbersObj: Record<string, number[]> = {};
      for (const sel of grouping.selectedUs) {
        numbersObj[`${sel.u}-${sel.id}`] = grouping.groupSelections[sel.id] || [];
      }
      return numbersObj;
    }
    if (numbers && typeof numbers === "object" && !Array.isArray(numbers)) {
      return numbers;
    }
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      "Grouping mode requires grouping data or numbers object",
    );
  }

  if (gameMode === "two_banker") {
    if (twobanker?.groupANumbers) {
      const groupBU = twobanker.totalUnder - twobanker.groupAU;
      const groupBNumbers = visibleNumbers.filter((n) => !twobanker.groupANumbers.includes(n));
      return {
        [`${twobanker.groupAU}-groupA`]: twobanker.groupANumbers,
        [`${groupBU}-groupB`]: groupBNumbers,
      };
    }
    if (numbers && typeof numbers === "object" && !Array.isArray(numbers)) {
      return numbers;
    }
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      "two_banker mode requires twobanker data or numbers object",
    );
  }

  if (gameMode === "one_banker") {
    const groupA =
      onebanker?.groupANumbers ||
      (Array.isArray(numbers) ? numbers : null);
    if (groupA && groupA.length > 0) {
      const groupBNumbers = visibleNumbers.filter((n) => !groupA.includes(n));
      return {
        "1-groupA": groupA,
        "1-groupB": groupBNumbers,
      };
    }
    if (numbers && typeof numbers === "object" && !Array.isArray(numbers)) {
      return numbers;
    }
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      "one_banker mode requires onebanker data or numbers",
    );
  }

  throw new PosError(POS_ERROR_CODES.INVALID_MODE, `Unsupported game mode: ${gameMode}`);
}

export async function placeLottoPosBet(
  supabase: SupabaseClient,
  input: PlaceLottoPosBetInput,
): Promise<PlaceLottoPosBetResult> {
  const { tsn, gameId, gameMode, stake, under, prizeId } = input;

  const terminal = await resolvePosTerminal(supabase, tsn, "lotto", stake);
  const game = await resolveActiveGame(supabase, "lotto", gameId);
  const resolvedGameId = game.id;
  const visibleNumbers: number[] =
    game.visible_numbers || Array.from({ length: 99 }, (_, i) => i + 1);

  const terminalPrizes = normalizeTerminalPrizeEntries(terminal.prizes);
  let resolvedPrizeId = prizeId || getDefaultTerminalPrizeId(terminal.prizes) || undefined;

  if (resolvedPrizeId) {
    const prizeEntry = terminalPrizes.find((p) => p.prize_id === resolvedPrizeId);
    if (prizeEntry && !isTerminalPrizeActive(prizeEntry)) {
      throw new PosError(
        POS_ERROR_CODES.PRIZE_INACTIVE,
        "Selected prize is inactive on this terminal",
        { prize_id: resolvedPrizeId },
      );
    }
  }

  const numbersObj = shapeNumbers(input, visibleNumbers);
  const apl = computeLottoApl(gameMode, stake, under, numbersObj);

  const { data: existingBets, error: countError } = await supabase
    .from("bets_lotto")
    .select("bet_id")
    .eq("game_id", resolvedGameId)
    .order("bet_id", { ascending: false })
    .limit(1);

  if (countError) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, countError.message);
  }

  const nextNumber = existingBets?.length ? existingBets[0].bet_id + 1 : 1;
  const now = new Date().toISOString();

  const { data: bet, error: insertError } = await supabase
    .from("bets_lotto")
    .insert({
      game_id: resolvedGameId,
      bet_id: nextNumber,
      terminal: terminal.id,
      player: null,
      numbers: numbersObj,
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
    throw new PosError(
      POS_ERROR_CODES.BET_SAVE_FAILED,
      insertError?.message || "Failed to save bet",
    );
  }

  const remainingCredit = await deductTerminalCredit(
    supabase,
    terminal.id,
    terminal.credit_limit,
    stake,
    async () => {
      await supabase.from("bets_lotto").delete().eq("id", bet.id);
    },
  );

  const award = await computeAward(supabase, resolvedGameId, bet, resolvedPrizeId);
  if (award > 0) {
    await supabase.from("bets_lotto").update({ award }).eq("id", bet.id);
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
