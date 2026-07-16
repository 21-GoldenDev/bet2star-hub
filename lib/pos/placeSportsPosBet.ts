import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcSportsGroupedApl,
  calcSportsPermutationLines,
  flattenSportsMatchNumbers,
  isGroupedSportsSelections,
  validateDrawOnlySelections,
  type SportsFlatSelections,
  type SportsGroupedSelections,
} from "@/lib/bets/sportsCombinations";
import { calculateBetReward } from "@/lib/helpers";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";
import { resolveActiveGame } from "@/lib/pos/resolveActiveGame";
import { deductTerminalCredit, resolvePosTerminal } from "@/lib/pos/resolvePosTerminal";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";
import type { GameType } from "@/lib/types/gameMode";

export type SportsPosMode = "direct" | "permutation" | "grouping" | "one_banker";

export type PlaceSportsPosBetInput = {
  tsn: string;
  gameId?: string;
  mode: SportsPosMode;
  stake: number;
  under: number[];
  selections?: SportsFlatSelections | SportsGroupedSelections;
  grouping?: {
    selectedUs: Array<{ id: string; u: number }>;
    groupSelections: SportsGroupedSelections;
  };
  onebanker?: {
    bankerMatchId?: string | number;
    selections?: SportsGroupedSelections;
  };
};

export type PlaceSportsPosBetResult = {
  apl: number;
  stake: number;
  mode: SportsPosMode;
  gameId: string;
  betId: string;
  betNumber: number;
  tsn: string;
  terminalId: string;
  remainingCredit: number;
  award: number;
  product: "sports" | "sports_draw";
};

function normalizeMode(mode: string): SportsPosMode {
  const normalized = mode.toLowerCase() as SportsPosMode;
  const allowed: SportsPosMode[] = ["direct", "permutation", "grouping", "one_banker"];
  if (!allowed.includes(normalized)) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_MODE,
      'Invalid mode. Must be "direct", "permutation", "grouping", or "one_banker"',
      { supportedModes: allowed },
    );
  }
  return normalized;
}

function resolveSelections(
  mode: SportsPosMode,
  under: number[],
  input: PlaceSportsPosBetInput,
): SportsFlatSelections | SportsGroupedSelections {
  let selections = input.selections;

  if (mode === "grouping") {
    if (input.grouping?.selectedUs?.length && input.grouping.groupSelections) {
      selections = input.grouping.groupSelections;
    }
    if (!selections || typeof selections !== "object") {
      throw new PosError(
        POS_ERROR_CODES.INVALID_SELECTIONS,
        "Grouping mode requires grouping data or selections",
      );
    }
    if (!Array.isArray(under) || under.length !== 1) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_SELECTIONS,
        'For grouping mode, "under" must be an array with a single total-under value',
      );
    }
    return selections;
  }

  if (mode === "one_banker") {
    selections = input.onebanker?.selections || selections;
    if (!selections || typeof selections !== "object") {
      throw new PosError(
        POS_ERROR_CODES.INVALID_SELECTIONS,
        "One banker mode requires selections",
      );
    }
    if (!Array.isArray(under) || under.length !== 1 || under[0] !== 2) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_SELECTIONS,
        'For one_banker mode, "under" must be [2]',
      );
    }
    return selections;
  }

  if (mode === "permutation" && (!Array.isArray(under) || under.length === 0)) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      'For permutation mode, "under" must be a non-empty array',
    );
  }

  if (mode === "direct" && (!Array.isArray(under) || under.length !== 1)) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      'For direct mode, "under" must be an array with a single value',
    );
  }

  if (!selections || typeof selections !== "object") {
    throw new PosError(POS_ERROR_CODES.INVALID_SELECTIONS, "Invalid selections");
  }

  return selections;
}

async function validateSportsSelectionsAvailability(
  supabase: SupabaseClient,
  gameId: string,
  selections: SportsFlatSelections | SportsGroupedSelections,
) {
  const selectedNumbers = flattenSportsMatchNumbers(selections);

  if (selectedNumbers.length === 0) {
    throw new PosError(POS_ERROR_CODES.INVALID_SELECTIONS, "No matches selected");
  }

  const { data: selectedMatches, error } = await supabase
    .from("sports")
    .select("number, status, end_time, processed")
    .eq("game_id", gameId)
    .in("number", selectedNumbers);

  if (error) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  if (!selectedMatches || selectedMatches.length !== selectedNumbers.length) {
    throw new PosError(
      POS_ERROR_CODES.MATCH_UNAVAILABLE,
      "One or more selected matches are unavailable",
    );
  }

  const now = Date.now();
  for (const match of selectedMatches) {
    if (match.status === "void") {
      throw new PosError(
        POS_ERROR_CODES.MATCH_UNAVAILABLE,
        `Match ${match.number} is inactive`,
        { match_number: match.number },
      );
    }
    if (Boolean(match.processed)) {
      throw new PosError(
        POS_ERROR_CODES.MATCH_UNAVAILABLE,
        `Match ${match.number} has been processed`,
        { match_number: match.number },
      );
    }
    if (match.end_time) {
      const end = new Date(match.end_time).getTime();
      if (Number.isFinite(end) && end <= now) {
        throw new PosError(
          POS_ERROR_CODES.MATCH_UNAVAILABLE,
          `Match ${match.number} has expired and can no longer be played`,
          { match_number: match.number },
        );
      }
    }
  }
}

export function computeSportsPosApl(
  mode: SportsPosMode,
  stake: number,
  under: number[],
  selections: SportsFlatSelections | SportsGroupedSelections,
): number {
  if (stake <= 0) {
    throw new PosError(POS_ERROR_CODES.INVALID_STAKE, "Stake must be greater than zero");
  }

  if (mode === "grouping" || mode === "one_banker") {
    if (!isGroupedSportsSelections(selections)) {
      // Treat keys like "1-groupA" → convert nested flat to grouped line calc via match counts
      const groups: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(selections)) {
        if (Array.isArray(value)) {
          groups[key] = value;
        } else if (value && typeof value === "object") {
          groups[key] = Object.keys(value);
        }
      }
      return calcSportsGroupedApl(stake, groups);
    }
    const groups: Record<string, string[]> = {};
    for (const [key, group] of Object.entries(selections)) {
      groups[key] = Object.keys(group);
    }
    return calcSportsGroupedApl(stake, groups);
  }

  const legCount = flattenSportsMatchNumbers(selections).length;
  const lines = calcSportsPermutationLines(legCount, under);
  if (lines <= 0) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      "Unable to compute APL for selections",
    );
  }
  return stake / lines;
}

async function computeSportsAward(
  supabase: SupabaseClient,
  gameId: string,
  bet: Record<string, unknown>,
  drawMode: boolean,
): Promise<number> {
  const { data: matches, error } = await supabase
    .from("sports")
    .select("*")
    .eq("game_id", gameId);

  if (error || !matches) {
    return 0;
  }

  const selections = (bet.selections || {}) as SportsFlatSelections | SportsGroupedSelections;
  const matchNumbers = flattenSportsMatchNumbers(selections);
  if (matchNumbers.length === 0) return 0;

  const matchesWithScores = matches.filter(
    (m) => Number.isFinite(m.home_goal) && Number.isFinite(m.away_goal),
  );

  const allSelectedHaveScores = matchNumbers.every((num) =>
    matchesWithScores.some((m) => m.number === num),
  );

  if (!allSelectedHaveScores) return 0;

  const maxWinAmount = await readMaxWinAmount(supabase);
  return calculateBetReward(bet, matchesWithScores, drawMode, maxWinAmount) || 0;
}

export async function placeSportsPosBet(
  supabase: SupabaseClient,
  product: Extract<GameType, "sports" | "sports_draw">,
  input: PlaceSportsPosBetInput,
): Promise<PlaceSportsPosBetResult> {
  const { tsn, gameId, stake } = input;
  const mode = normalizeMode(input.mode);
  const under = input.under.map(Number).filter((n) => Number.isFinite(n));

  const terminal = await resolvePosTerminal(supabase, tsn, product, stake);
  const game = await resolveActiveGame(supabase, product, gameId);
  const resolvedGameId = game.id;

  const selections = resolveSelections(mode, under, input);

  if (product === "sports_draw" && !validateDrawOnlySelections(selections)) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_SELECTIONS,
      "Sports draw selections must contain only draw (D) options",
    );
  }

  await validateSportsSelectionsAvailability(supabase, resolvedGameId, selections);

  const apl = computeSportsPosApl(mode, stake, under, selections);
  const table = product === "sports" ? "bets_sport" : "bets_sports_draw";

  const { data: existingBets, error: countError } = await supabase
    .from(table)
    .select("number")
    .eq("game_id", resolvedGameId)
    .order("number", { ascending: false })
    .limit(1);

  if (countError) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, countError.message);
  }

  const nextNumber = existingBets?.length ? existingBets[0].number + 1 : 1;
  const now = new Date().toISOString();

  const { data: bet, error: insertError } = await supabase
    .from(table)
    .insert({
      game_id: resolvedGameId,
      number: nextNumber,
      terminal: terminal.id,
      player: null,
      mode,
      under,
      staked: stake,
      bet_time: now,
      status: "active",
      selections,
      award: 0,
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
      await supabase.from(table).delete().eq("id", bet.id);
    },
  );

  const award = await computeSportsAward(
    supabase,
    resolvedGameId,
    bet,
    product === "sports_draw",
  );
  if (award > 0) {
    await supabase.from(table).update({ award }).eq("id", bet.id);
  }

  return {
    apl: Math.round(apl * 100) / 100,
    stake,
    mode,
    gameId: resolvedGameId,
    betId: bet.id,
    betNumber: nextNumber,
    tsn: terminal.serial_number,
    terminalId: terminal.id,
    remainingCredit,
    award,
    product,
  };
}
