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

const sportOptions = ["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"];

export function calculateBetReward(bet: any, matches: any[]): number {
  if (!bet || bet.status === "void" || bet.status !== "active") return 0;

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
