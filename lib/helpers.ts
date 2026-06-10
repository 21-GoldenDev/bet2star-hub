import { Prize } from "./types/prize";

export function formatLottoWeekLabel(week: number, gameName?: string | null): string {
  const trimmed = gameName?.trim();
  if (trimmed) {
    return `Game ${week} ${trimmed}`;
  }
  return String(week);
}

const calcCombination = (total: number, select: number) => {
  if (select > total || select <= 0) return 0;
  if (select === total) return 1;
  let numerator = 1;
  let denominator = 1;
  for (let i = 0; i < select; i++) {
    numerator *= (total - i);
    denominator *= (i + 1);
  }
  return numerator / denominator;
}

export const calcAplDirect = (stake: number, unders: number[], numbers: number) => {
  if (unders.length === 0 || numbers <= 0) return 1;
  let totalWays = 0;
  for (const u of unders) {
    totalWays += calcCombination(numbers, u) || 1;
  }
  const apl = stake / (totalWays || 1);
  return apl;
}

export const calcAplGrouping = (stake: number, selects: Record<string, string[] | number[]>) => {
  if (!selects || Object.keys(selects).length === 0) return 1;
  let totalWays = 1;
  for (const key in selects) {
    const items = selects[key];
    const u = Number(key.split("-")[0]);;
    if (isNaN(u) || u <= 0) continue;
    totalWays *= calcCombination(items.length, u) || 1;
  }
  const apl = stake / totalWays;;
  return apl;
}

const isArrayInvolved = (array1: string[], array2: string[]): boolean => {
  if (array2.length === 0) return true;
  return array2.every(item => array1.includes(item));
}

const generateCombinations = (array: any[], length: number): any[][] => {
  if (length === 0) return [[]];
  if (length > array.length) return [];
  if (length === 1) return array.map(item => [item]);

  const result: any[][] = [];
  for (let i = 0; i <= array.length - length; i++) {
    const head = array[i];
    const tail = generateCombinations(array.slice(i + 1), length - 1);
    result.push(...tail.map(combination => [head, ...combination]));
  }
  return result;
}

export const parseDraws = (text: string): { start: number; end: number } | null => {
  const match = text.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (!match) return null;

  const [, start, end] = match;
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);

  if (startNum > endNum) return null;

  return { start: startNum, end: endNum };
}

export const calcAwardLine = (
  selectedNumbers: number[] | string[],
  resultNumbers: number[] | string[],
  matchAtLeast: number,
): number => {
  let totalAward = 0;
  const combinations = generateCombinations(selectedNumbers, matchAtLeast);
  for (const combo of combinations) {
    if (isArrayInvolved(resultNumbers.map(String), combo.map(String))) {
      totalAward += 1;
    }
  }
  return totalAward;
}

export type TurboPrize = {
  data?: Record<string, number>;
};

export function calculateBetReward(bet: any, matches: any[], drawMode?: boolean): number {
  if (!bet || bet.status === "void" || bet.status !== "active") return 0;

  const sportOptions = drawMode ? ["D"] : ["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"];

  const selections = bet.selections || {};
  const matchNumbers = Object.keys(selections);
  const selectedMatchCount = matchNumbers.length;

  if (selectedMatchCount === 0) return 0;

  const unders: number[] = Array.isArray(bet.under)
    ? bet.under.map((u: any) => Number(u)).filter((u: number) => Number.isFinite(u) && u > 0)
    : [];

  const totalWays = unders.reduce((sum, u) => sum + calcCombination(selectedMatchCount, u), 0);
  if (totalWays <= 0) return 0;

  let winning = 0;

  for (const under of unders) {
    const combinations = generateCombinations(matchNumbers, under);
    for (const combo of combinations) {
      let isComboWinning = true;
      let multiple = 1;
      for (const matchNumberStr of combo) {
        const selectedOptions: string[] = selections[matchNumberStr] || [];
        const match = matches.find((m) => m.number === Number(matchNumberStr));
        if (!match) {
          isComboWinning = false;
          break;
        }
        if (match.status === "void") {
          continue;
        }
        const homeGoal = match.home_goal || 0;
        const awayGoal = match.away_goal || 0;
        const correctOptions = getCorrectOptions(homeGoal, awayGoal);
        const isMatchCorrect = selectedOptions.length > 0 && selectedOptions.every((opt) => correctOptions.includes(opt));
        if (!isMatchCorrect) {
          isComboWinning = false;
          break;
        }
        for (const opt of selectedOptions) {
          const prizeIndex = sportOptions.indexOf(opt);
          if (prizeIndex >= 0 && match.prizes && match.prizes[prizeIndex]) {
            multiple *= match.prizes[prizeIndex];
          }
        }
      }
      if (isComboWinning) {
        winning += multiple;
      }
    }
  }
  if (winning <= 0) return 0;

  const apl = (bet.staked || 0) / totalWays;

  return apl * winning;
}

export function computeLottoAward(
  bet: any,
  prize: Prize | null,
  weekResult: number[],
  turboPrizeData?: TurboPrize | null,
): number {
  if (!bet) return 0;
  if (bet.status === "void") return bet.staked || 0;

  if (bet.gameType === "turbo") {
    let turboPrize: number[];
    if (turboPrizeData && turboPrizeData.data) {
      turboPrize = Object.values(turboPrizeData.data) as number[];
    } else {
      turboPrize = [50, 150, 300];
    }
    const betNumbers = bet.numbers || [];
    if (!Array.isArray(betNumbers) || betNumbers.length === 0) return 0;

    if (weekResult.join(",").includes(betNumbers.join(","))) {
      const matchCount = betNumbers.length;
      if (matchCount < 2) return 0;
      const prizeIndex = Math.min(matchCount - 2, turboPrize.length - 1);
      return (turboPrize[prizeIndex] || 0) * (bet.staked || 0);
    }
    return 0;
  }

  if (!prize || !prize.data || !prize.data.data || !prize.data.columns) return 0;

  if (bet.gameType === "under1" || bet.gameType === "under2") {
    const betNumbers = bet.numbers || [];
    if (!Array.isArray(betNumbers) || betNumbers.length === 0) return 0;

    const win = betNumbers.every((num: number) => weekResult.includes(num));
    if (!win) return 0;

    let award = 0;
    Object.keys(prize.data.data).forEach((drawKey: string) => {
      const parsedDraw = parseDraws(drawKey);
      if (!parsedDraw) return;
      const { start, end } = parsedDraw;
      if (weekResult.length < start || weekResult.length > end) return;

      const columnIndex = bet.gameType === "under1" ? 0 : 1;
      const multiplier = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
      award = multiplier * (bet.staked || 0);
    });
    return award;
  }

  const isNapPerm = bet.gameType === "nap_perm";
  const apl = isNapPerm
    ? calcAplDirect(bet.staked || 0, bet.under || [], (bet.numbers || []).length)
    : calcAplGrouping(bet.staked || 0, bet.numbers || {});

  let award = 0;

  Object.keys(prize.data.data).forEach((drawKey: string) => {
    const parsedDraw = parseDraws(drawKey);
    if (!parsedDraw) return;
    const { start, end } = parsedDraw;
    if (weekResult.length < start || weekResult.length > end) return;

    let multiplier = 0;
    if (isNapPerm) {
      (bet.under || []).forEach((u: number) => {
        const columnIndex = prize.data?.columns?.findIndex((col: string) => col.toUpperCase() === `U${u}`) ?? -1;
        if (columnIndex !== -1) {
          const colVal = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
          multiplier += colVal * calcAwardLine(bet.numbers || [], weekResult, u);
        }
      });
    } else {
      const awardLine = Object.keys(bet.numbers || {}).reduce((acc: number, gid: string) => {
        const nums = (bet.numbers as any)?.[gid] || [];
        const u = Number(gid.split("-")[0]);
        return acc * calcAwardLine(nums, weekResult, u);
      }, 1);

      (bet.under || []).forEach((u: number) => {
        const columnIndex = prize.data?.columns?.findIndex((col: string) => col.toUpperCase() === `U${u}`) ?? -1;
        if (columnIndex !== -1) {
          const colVal = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
          multiplier += colVal;
        }
      });

      multiplier *= awardLine;
    }

    award = multiplier * apl;
  });

  if (!Number.isFinite(award)) return 0;
  return award;
}

/** Remove a pools result exception number before matching (draw count uses the original result). */
export function applyResultException(
  weekResult: Array<string | number>,
  exception?: string | null,
): string[] {
  if (!exception) return weekResult.map(String);
  const exclude = String(exception);
  return weekResult.map(String).filter((n) => n !== exclude);
}

export function computePoolsAward(
  bet: any,
  prize: Prize | null,
  weekResult: string[],
  turboPrizeData?: TurboPrize | null,
  resultException?: string | null,
): number {
  if (!bet) return 0;
  if (bet.status === "void") return bet.staked || 0;

  const matchResult = applyResultException(weekResult, resultException);

  if (bet.gameType === "turbo") {
    let turboPrize: number[];
    if (turboPrizeData && turboPrizeData.data) {
      turboPrize = Object.values(turboPrizeData.data) as number[];
    } else {
      turboPrize = [50, 150, 300];
    }
    const betMatches = bet.matches || [];
    if (!Array.isArray(betMatches) || betMatches.length === 0) return 0;

    if (matchResult.join(",").includes(betMatches.join(","))) {
      const matchCount = betMatches.length;
      if (matchCount < 2) return 0;
      const prizeIndex = Math.min(matchCount - 2, turboPrize.length - 1);
      return (turboPrize[prizeIndex] || 0) * (bet.staked || 0);
    }
    return 0;
  }

  if (!prize || !prize.data || !prize.data.data || !prize.data.columns) return 0;

  if (bet.gameType === "under1" || bet.gameType === "under2") {
    const betMatches = bet.matches || [];
    if (!Array.isArray(betMatches) || betMatches.length === 0) return 0;

    const win = betMatches.every((match: string) =>
      matchResult.toString().includes(match.toString()),
    );
    if (!win) return 0;

    let award = 0;
    Object.keys(prize.data.data).forEach((drawKey: string) => {
      const parsedDraw = parseDraws(drawKey);
      if (!parsedDraw) return;
      const { start, end } = parsedDraw;
      if (weekResult.length < start || weekResult.length > end) return;

      const columnIndex = bet.gameType === "under1" ? 0 : 1;
      const multiplier = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
      award = multiplier * (bet.staked || 0);
    });
    return award;
  }

  const isNapPerm = bet.gameType === "nap_perm";
  const apl = isNapPerm
    ? calcAplDirect(bet.staked || 0, (bet.under || []).map((u: any) => Number(u)), (bet.matches || []).length)
    : calcAplGrouping(bet.staked || 0, bet.matches || {});

  let award = 0;

  Object.keys(prize.data.data).forEach((drawKey: string) => {
    const parsedDraw = parseDraws(drawKey);
    if (!parsedDraw) return;
    const { start, end } = parsedDraw;
    if (weekResult.length < start || weekResult.length > end) return;

    let multiplier = 0;
    if (isNapPerm) {
      (bet.under || []).forEach((u: any) => {
        const uStr = String(u);
        const columnIndex = prize.data?.columns?.findIndex((col: string) => col.toUpperCase() === `U${uStr}`) ?? -1;
        if (columnIndex !== -1) {
          const colVal = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
          multiplier += colVal * calcAwardLine(bet.matches || [], matchResult, Number(u));
        }
      });
    } else {
      const awardLine = Object.keys(bet.matches || {}).reduce((acc: number, gid: string) => {
        const ms = (bet.matches as any)?.[gid] || [];
        const u = Number(gid.split("-")[0]);
        return acc * calcAwardLine(ms, matchResult, u);
      }, 1);

      (bet.under || []).forEach((u: any) => {
        const uStr = String(u);
        const columnIndex = prize.data?.columns?.findIndex((col: string) => col.toUpperCase() === `U${uStr}`) ?? -1;
        if (columnIndex !== -1) {
          const colVal = (prize.data?.data?.[drawKey]?.[columnIndex] || 0) as number;
          multiplier += colVal;
        }
      });

      multiplier *= awardLine;
    }

    award = multiplier * apl;
  });

  if (!Number.isFinite(award)) return 0;
  return award;
}

function getCorrectOptions(homeGoal: number, awayGoal: number): string[] {
  const correctOptions: string[] = [];

  if (homeGoal > awayGoal) correctOptions.push("H");
  if (homeGoal === awayGoal) correctOptions.push("D");
  if (awayGoal > homeGoal) correctOptions.push("A");

  if (homeGoal > awayGoal || homeGoal === awayGoal) correctOptions.push("1X");
  if (homeGoal > awayGoal || awayGoal > homeGoal) correctOptions.push("12");
  if (homeGoal === awayGoal || awayGoal > homeGoal) correctOptions.push("X2");
  if (homeGoal + awayGoal > 2.5) correctOptions.push("O25");
  if (homeGoal + awayGoal < 2.5) correctOptions.push("U25");
  if (homeGoal > 0 && awayGoal > 0) correctOptions.push("GG");

  return correctOptions;
}
