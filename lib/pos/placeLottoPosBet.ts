import { SupabaseClient } from "@supabase/supabase-js";
import { computeLottoAward, computeLottoApl } from "@/lib/helpers";
import { getDefaultTerminalPrizeId, isTerminalPrizeActive, normalizeTerminalPrizeEntries } from "@/lib/terminals/terminalPrize";
import type { GameModeType } from "@/lib/types/gameMode";
import type { Prize } from "@/lib/types/prize";

type PlaceLottoPosBetInput = {
  tsn: string;
  gameId: string;
  gameMode: GameModeType;
  stake: number;
  under: number[];
  numbers: number[] | Record<string, number[]>;
  prizeId?: string;
};

export type PlaceLottoPosBetResult = {
  apl: number;
  stake: number;
  gameMode: GameModeType;
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

export async function placeLottoPosBet(
  supabase: SupabaseClient,
  input: PlaceLottoPosBetInput,
): Promise<PlaceLottoPosBetResult> {
  const { tsn, gameId, gameMode, stake, under, numbers, prizeId } = input;

  const { data: terminal, error: terminalError } = await supabase
    .from("terminal")
    .select("id, serial_number, status, credit_limit, max_stake, game_types, game_modes, prizes")
    .eq("serial_number", tsn)
    .maybeSingle();

  if (terminalError) {
    throw new Error(terminalError.message);
  }

  if (!terminal) {
    throw new Error("Terminal not found");
  }

  if (terminal.status !== "active") {
    throw new Error("Terminal is inactive");
  }

  const allowedGameTypes = Array.isArray(terminal.game_modes) ? terminal.game_modes : [];
  if (allowedGameTypes.length > 0 && !allowedGameTypes.includes("lotto")) {
    throw new Error("Terminal is not allowed to place lotto bets");
  }

  const allowedModes = Array.isArray(terminal.game_types) ? terminal.game_types : [];
  if (allowedModes.length > 0 && !allowedModes.includes(gameMode)) {
    throw new Error(`Terminal is not allowed to place ${gameMode} bets`);
  }

  const maxStake = Number(terminal.max_stake || 0);
  if (maxStake > 0 && stake > maxStake) {
    throw new Error(`Maximum stake is ${maxStake}`);
  }

  const currentCredit = Number(terminal.credit_limit || 0);
  if (currentCredit < stake) {
    throw new Error("Insufficient terminal credit");
  }

  const now = new Date().toISOString();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, start_time, end_time, visible_numbers")
    .eq("id", gameId)
    .eq("type", "lotto")
    .single();

  if (gameError || !game) {
    throw new Error("Lotto game not found");
  }

  if (game.start_time > now || game.end_time < now) {
    throw new Error("Lotto game is not active");
  }

  const terminalPrizes = normalizeTerminalPrizeEntries(terminal.prizes);
  let resolvedPrizeId = prizeId || getDefaultTerminalPrizeId(terminal.prizes) || undefined;

  if (resolvedPrizeId) {
    const prizeEntry = terminalPrizes.find((p) => p.prize_id === resolvedPrizeId);
    if (prizeEntry && !isTerminalPrizeActive(prizeEntry)) {
      throw new Error("Selected prize is inactive on this terminal");
    }
  }

  const apl = computeLottoApl(gameMode, stake, under, numbers);

  const { data: existingBets, error: countError } = await supabase
    .from("bets_lotto")
    .select("bet_id")
    .eq("game_id", gameId)
    .order("bet_id", { ascending: false })
    .limit(1);

  if (countError) {
    throw new Error(countError.message);
  }

  const nextNumber = existingBets?.length ? existingBets[0].bet_id + 1 : 1;

  let numbersObj: Record<string, number[]> | number[] = Array.isArray(numbers) ? numbers : numbers;

  if (gameMode === "one_banker" && Array.isArray(numbers) && numbers.length === 1) {
    const visibleNumbers: number[] = game.visible_numbers || Array.from({ length: 99 }, (_, i) => i + 1);
    const groupBNumbers = visibleNumbers.filter((n) => !numbers.includes(n));
    numbersObj = {
      "1-groupA": numbers,
      "1-groupB": groupBNumbers,
    };
  }

  const { data: bet, error: insertError } = await supabase
    .from("bets_lotto")
    .insert({
      game_id: gameId,
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
    throw new Error(insertError?.message || "Failed to save bet");
  }

  const { error: creditError } = await supabase
    .from("terminal")
    .update({ credit_limit: currentCredit - stake })
    .eq("id", terminal.id);

  if (creditError) {
    await supabase.from("bets_lotto").delete().eq("id", bet.id);
    throw new Error("Failed to deduct terminal credit");
  }

  const award = await computeAward(supabase, gameId, bet, resolvedPrizeId);
  if (award > 0) {
    await supabase.from("bets_lotto").update({ award }).eq("id", bet.id);
  }

  return {
    apl: Math.round(apl * 100) / 100,
    stake,
    gameMode,
    betId: bet.id,
    betNumber: nextNumber,
    tsn: terminal.serial_number,
    terminalId: terminal.id,
    remainingCredit: currentCredit - stake,
    award,
  };
}
