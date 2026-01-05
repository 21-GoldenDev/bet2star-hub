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
