export const SPORT_OPTIONS = ["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"] as const;
export type SportOptionKey = (typeof SPORT_OPTIONS)[number];

export type SportsFlatSelections = Record<string, string[]>;
export type SportsGroupedSelections = Record<string, SportsFlatSelections>;

export function isGroupedSportsSelections(
  selections: SportsFlatSelections | SportsGroupedSelections,
): selections is SportsGroupedSelections {
  if (!selections || typeof selections !== "object") return false;
  const values = Object.values(selections);
  if (values.length === 0) return false;
  return values.some((v) => v && typeof v === "object" && !Array.isArray(v));
}

export function validateDrawOnlySelections(
  selections: SportsFlatSelections | SportsGroupedSelections,
): boolean {
  if (isGroupedSportsSelections(selections)) {
    return Object.values(selections).every((group) =>
      Object.values(group).every(
        (opts) => Array.isArray(opts) && opts.length > 0 && opts.every((o) => o === "D"),
      ),
    );
  }
  return Object.values(selections).every(
    (opts) => Array.isArray(opts) && opts.length > 0 && opts.every((o) => o === "D"),
  );
}

export function flattenSportsMatchNumbers(
  selections: SportsFlatSelections | SportsGroupedSelections,
): number[] {
  if (!isGroupedSportsSelections(selections)) {
    return Object.keys(selections)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));
  }
  const nums = new Set<number>();
  for (const group of Object.values(selections)) {
    for (const key of Object.keys(group)) {
      const n = Number(key);
      if (Number.isFinite(n)) nums.add(n);
    }
  }
  return Array.from(nums);
}

export function calcCombination(total: number, select: number): number {
  if (select > total || select <= 0) return 0;
  if (select === total) return 1;
  let numerator = 1;
  let denominator = 1;
  for (let i = 0; i < select; i++) {
    numerator *= total - i;
    denominator *= i + 1;
  }
  return numerator / denominator;
}

export function generateCombinations<T>(array: T[], length: number): T[][] {
  if (length === 0) return [[]];
  if (length > array.length) return [];
  if (length === 1) return array.map((item) => [item]);

  const result: T[][] = [];
  for (let i = 0; i <= array.length - length; i++) {
    const head = array[i];
    const tail = generateCombinations(array.slice(i + 1), length - 1);
    result.push(...tail.map((combination) => [head, ...combination]));
  }
  return result;
}

export function calcSportsGroupedLines(groups: Record<string, string[] | number[]>): number {
  if (!groups || Object.keys(groups).length === 0) return 0;
  let totalWays = 1;
  for (const key in groups) {
    const items = groups[key];
    const u = Number(key.split("-")[0]);
    if (isNaN(u) || u <= 0) continue;
    totalWays *= calcCombination(items.length, u) || 1;
  }
  return totalWays;
}

export function calcSportsGroupedApl(
  stake: number,
  groups: Record<string, string[] | number[]>,
): number {
  const lines = calcSportsGroupedLines(groups);
  if (lines <= 0) return 0;
  return stake / lines;
}

export function getCorrectSportOptions(homeGoal: number, awayGoal: number): string[] {
  const correct: string[] = [];
  if (homeGoal > awayGoal) correct.push("H");
  if (homeGoal === awayGoal) correct.push("D");
  if (awayGoal > homeGoal) correct.push("A");
  if (homeGoal > awayGoal || homeGoal === awayGoal) correct.push("1X");
  if (homeGoal > awayGoal || awayGoal > homeGoal) correct.push("12");
  if (homeGoal === awayGoal || awayGoal > homeGoal) correct.push("X2");
  if (homeGoal + awayGoal > 2.5) correct.push("O25");
  if (homeGoal + awayGoal < 2.5) correct.push("U25");
  if (homeGoal > 0 && awayGoal > 0) correct.push("GG");
  return correct;
}

export function getMatchOdds(
  match: { prizes?: number[]; status?: string },
  option: string,
  drawMode?: boolean,
): number {
  if (match.status === "void") return 1;
  const options = drawMode ? ["D"] : [...SPORT_OPTIONS];
  const idx = options.indexOf(option);
  if (idx >= 0 && match.prizes && match.prizes[idx]) {
    return match.prizes[idx];
  }
  return 1;
}

export function isSportsLegWinning(
  match: { home_goal?: number; away_goal?: number; status?: string },
  selectedOptions: string[],
  drawMode?: boolean,
): boolean {
  if (match.status === "void") return true;
  if (!selectedOptions.length) return false;
  const homeGoal = match.home_goal ?? 0;
  const awayGoal = match.away_goal ?? 0;
  const correct = drawMode ? ["D"] : getCorrectSportOptions(homeGoal, awayGoal);
  return selectedOptions.every((opt) => correct.includes(opt));
}

type LegInfo = { matchNumber: string; options: string[]; odds: number; winning: boolean };

function buildGroupLegs(
  groupSelections: SportsFlatSelections,
  matches: any[],
  drawMode?: boolean,
): LegInfo[] {
  const legs: LegInfo[] = [];
  for (const [matchNumberStr, options] of Object.entries(groupSelections)) {
    const match = matches.find((m) => m.number === Number(matchNumberStr));
    if (!match) continue;
    let legOdds = 1;
    for (const opt of options) {
      legOdds *= getMatchOdds(match, opt, drawMode);
    }
    legs.push({
      matchNumber: matchNumberStr,
      options,
      odds: legOdds,
      winning: isSportsLegWinning(match, options, drawMode),
    });
  }
  return legs;
}

function groupWinningOddsSum(legs: LegInfo[], u: number): number {
  if (legs.length === 0 || u <= 0 || u > legs.length) return 0;
  const combos = generateCombinations(legs, u);
  let sum = 0;
  for (const combo of combos) {
    if (combo.every((leg) => leg.winning)) {
      sum += combo.reduce((acc, leg) => acc * leg.odds, 1);
    }
  }
  return sum;
}

export function calculateSportsGroupedReward(
  bet: {
    staked?: number;
    status?: string;
    selections: SportsGroupedSelections;
  },
  matches: any[],
  drawMode?: boolean,
): number {
  if (!bet || bet.status === "void" || bet.status !== "active") return 0;

  const groups = bet.selections;
  if (!groups || !isGroupedSportsSelections(groups)) return 0;

  const groupKeys = Object.keys(groups);
  if (groupKeys.length === 0) return 0;

  const groupMeta = groupKeys.map((key) => ({
    key,
    u: Number(key.split("-")[0]),
    selections: groups[key],
    matchCount: Object.keys(groups[key] || {}).length,
  }));

  const totalLines = groupMeta.reduce((acc, g) => {
    if (isNaN(g.u) || g.u <= 0 || g.matchCount === 0) return 0;
    return acc * (calcCombination(g.matchCount, g.u) || 1);
  }, 1);

  if (totalLines <= 0) return 0;

  let multiplier = 1;
  for (const g of groupMeta) {
    if (isNaN(g.u) || g.u <= 0) return 0;
    const legs = buildGroupLegs(g.selections, matches, drawMode);
    if (legs.length < g.u) return 0;
    const groupSum = groupWinningOddsSum(legs, g.u);
    if (groupSum <= 0) return 0;
    multiplier *= groupSum;
  }

  const apl = (bet.staked || 0) / totalLines;
  return apl * multiplier;
}

export function previewSportsGroupedWinnings(
  stake: number,
  groups: Record<string, SportsFlatSelections>,
  oddsMap: Record<string, number>,
): { min: number; max: number; numLines: number; apl: number } | null {
  const groupKeys = Object.keys(groups);
  if (groupKeys.length === 0 || stake <= 0) return null;

  const lineCounts = groupKeys.map((key) => {
    const u = Number(key.split("-")[0]);
    const count = Object.keys(groups[key] || {}).length;
    return calcCombination(count, u);
  });

  if (lineCounts.some((c) => c <= 0)) return null;

  const numLines = lineCounts.reduce((a, b) => a * b, 1);
  const apl = stake / numLines;

  const groupLegOdds = groupKeys.map((key) => {
    const u = Number(key.split("-")[0]);
    const matchNums = Object.keys(groups[key] || {});
    const legOddsList = matchNums.map((mn) => oddsMap[mn] ?? 1);
    const combos = generateCombinations(legOddsList, u);
    const products = combos.map((combo) => combo.reduce((a, b) => a * b, 1));
    return { u, matchNums, legOddsList, products };
  });

  const max = apl * groupLegOdds.reduce((acc, g) => acc * g.products.reduce((a, b) => a + b, 0), 1);

  let min = Infinity;
  for (let failIdx = 0; failIdx < groupLegOdds.length; failIdx++) {
    const g = groupLegOdds[failIdx];
    if (g.u >= g.matchNums.length) continue;
    for (let i = 0; i < g.matchNums.length; i++) {
      const remaining = g.legOddsList.filter((_, idx) => idx !== i);
      if (remaining.length < g.u) continue;
      const combos = generateCombinations(remaining, g.u);
      const failScenario = combos.map((c) => c.reduce((a, b) => a * b, 1));
      const failSum = failScenario.reduce((a, b) => a + b, 0);
      const otherProduct = groupLegOdds
        .filter((_, idx) => idx !== failIdx)
        .reduce((acc, og) => acc * og.products.reduce((a, b) => a + b, 0), 1);
      const scenarioWin = apl * failSum * otherProduct;
      if (scenarioWin > 0 && scenarioWin < min) min = scenarioWin;
    }
  }

  if (!Number.isFinite(min)) {
    min = Math.min(...groupLegOdds.flatMap((g) => g.products)) * apl;
  }

  return { min, max, numLines, apl };
}
