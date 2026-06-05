import { computeLottoAward, type TurboPrize } from "@/lib/helpers";
import { resolveTerminalPrizeCommission } from "@/lib/terminals/terminalPrize";
import { Prize } from "@/lib/types/prize";

type PrizeWithCommission = Prize & { commission?: number };

export type LottoGenerateMode = "win_equals" | "win_above" | "win_below";

export interface LottoGenerateOptions {
  mode: LottoGenerateMode;
  difference?: number;
  count: number;
  rangeMin: number;
  rangeMax: number;
}

export interface LottoGenerateResult {
  numbers: number[];
  totalPayable: number;
  targetWin: number;
  projectedWin: number;
  winPayableGap: number;
}

type BetRow = {
  gameType: string;
  staked?: number;
  under?: number[];
  numbers?: unknown;
  prize_id?: string;
  terminal?: string | null;
  status?: string;
};

function pickUniqueRandom(count: number, min: number, max: number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) pool.push(i);

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * (pool.length - i)) + i;
    [pool[i], pool[idx]] = [pool[idx], pool[i]];
    result.push(pool[i]);
  }
  return result;
}

export function computeLottoTotalPayable(
  bets: BetRow[],
  terminalsData: Record<string, { prizes?: unknown }>,
  prizeMap: Record<string, PrizeWithCommission>,
): number {
  let payable = 0;

  for (const bet of bets) {
    if (bet.status === "void") continue;
    const staked = bet.staked || 0;
    if (!bet.terminal) {
      payable += staked;
      continue;
    }

    let commission = 100;
    const terminalData = terminalsData[bet.terminal];
    if (terminalData) {
      const masterCommission =
        bet.prize_id && prizeMap[bet.prize_id]
          ? prizeMap[bet.prize_id].commission || 100
          : 100;
      commission = resolveTerminalPrizeCommission(
        terminalData.prizes,
        bet.prize_id,
        masterCommission,
      );
    }
    payable += staked * (commission / 100);
  }

  return payable;
}

export function computeLottoTotalWinForResult(
  bets: BetRow[],
  prizeMap: Record<string, Prize>,
  weekResult: number[],
  turboPrizeData?: TurboPrize | null,
): number {
  return bets.reduce((sum, bet) => {
    const prize = bet.prize_id ? prizeMap[bet.prize_id] ?? null : null;
    return sum + computeLottoAward(bet, prize, weekResult, turboPrizeData);
  }, 0);
}

function distanceToTarget(projectedWin: number, targetWin: number): number {
  return Math.abs(projectedWin - targetWin);
}

function tryImproveResult(
  current: number[],
  min: number,
  max: number,
  bets: BetRow[],
  prizeMap: Record<string, Prize>,
  turboPrizeData: TurboPrize | null,
  targetWin: number,
): number[] {
  const used = new Set(current);
  const available: number[] = [];
  for (let n = min; n <= max; n++) {
    if (!used.has(n)) available.push(n);
  }
  if (available.length === 0) return current;

  const replaceIndex = Math.floor(Math.random() * current.length);
  const replacement = available[Math.floor(Math.random() * available.length)];
  const candidate = [...current];
  candidate[replaceIndex] = replacement;

  const currentWin = computeLottoTotalWinForResult(bets, prizeMap, current, turboPrizeData);
  const candidateWin = computeLottoTotalWinForResult(bets, prizeMap, candidate, turboPrizeData);

  if (distanceToTarget(candidateWin, targetWin) <= distanceToTarget(currentWin, targetWin)) {
    return candidate;
  }
  return current;
}

export function generateLottoResult(
  bets: BetRow[],
  prizeMap: Record<string, PrizeWithCommission>,
  terminalsData: Record<string, { prizes?: unknown }>,
  turboPrizeData: TurboPrize | null,
  options: LottoGenerateOptions,
): LottoGenerateResult {
  const { mode, count, rangeMin, rangeMax } = options;
  const difference = options.difference ?? 0;
  const totalPayable = computeLottoTotalPayable(bets, terminalsData, prizeMap);
  const targetWin =
    mode === "win_equals"
      ? totalPayable
      : mode === "win_above"
        ? totalPayable + difference
        : Math.max(0, totalPayable - difference);

  const activeBets = bets.filter((bet) => bet.status !== "void");
  const rangeSize = rangeMax - rangeMin + 1;

  let bestNumbers = pickUniqueRandom(count, rangeMin, rangeMax);
  let bestWin = computeLottoTotalWinForResult(activeBets, prizeMap, bestNumbers, turboPrizeData);
  let bestDistance = distanceToTarget(bestWin, targetWin);

  const randomAttempts = Math.min(5000, Math.max(1000, rangeSize * 20));
  for (let i = 0; i < randomAttempts; i++) {
    const candidate = pickUniqueRandom(count, rangeMin, rangeMax);
    const projectedWin = computeLottoTotalWinForResult(
      activeBets,
      prizeMap,
      candidate,
      turboPrizeData,
    );
    const distance = distanceToTarget(projectedWin, targetWin);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNumbers = candidate;
      bestWin = projectedWin;
    }
    if (bestDistance === 0) break;
  }

  const refineAttempts = Math.min(2000, randomAttempts);
  let refined = [...bestNumbers];
  for (let i = 0; i < refineAttempts; i++) {
    refined = tryImproveResult(
      refined,
      rangeMin,
      rangeMax,
      activeBets,
      prizeMap,
      turboPrizeData,
      targetWin,
    );
  }

  const projectedWin = computeLottoTotalWinForResult(
    activeBets,
    prizeMap,
    refined,
    turboPrizeData,
  );

  return {
    numbers: refined,
    totalPayable,
    targetWin,
    projectedWin,
    winPayableGap: totalPayable - projectedWin,
  };
}
