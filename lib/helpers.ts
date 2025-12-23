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
