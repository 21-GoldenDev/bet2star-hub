/** Label like "Group A" from keys such as "2-groupA"; falls back to "Group 1". */
export function formatSelectionGroupLabel(gid: string, index: number): string {
  const letter = /group([A-Za-z])$/i.exec(gid)?.[1];
  if (letter) return `Group ${letter.toUpperCase()}`;
  return `Group ${index + 1}`;
}

/** Prefer Group A before Group B when keys include banker suffixes. */
export function sortedSelectionGroupEntries<T>(
  groups: Record<string, T>,
): Array<[string, T]> {
  return Object.entries(groups).sort(([a], [b]) => {
    const la = /group([A-Za-z])$/i.exec(a)?.[1]?.toUpperCase();
    const lb = /group([A-Za-z])$/i.exec(b)?.[1]?.toUpperCase();
    if (la && lb && la !== lb) return la.localeCompare(lb);

    const ua = Number.parseInt(a.split("-")[0] || "", 10);
    const ub = Number.parseInt(b.split("-")[0] || "", 10);
    if (Number.isFinite(ua) && Number.isFinite(ub) && ua !== ub) return ua - ub;

    return a.localeCompare(b);
  });
}

export function buildTwoBankerPoolsMatches(
  visibleMatches: string[],
  groupAU: number,
  groupAMatches: Array<string | number>,
  totalUnder: number,
): Record<string, string[]> {
  const groupA = groupAMatches.map(String);
  const groupASet = new Set(groupA);
  const groupBU = totalUnder - groupAU;
  return {
    [`${groupAU}-groupA`]: groupA,
    [`${groupBU}-groupB`]: visibleMatches.filter((n) => !groupASet.has(n)),
  };
}

export function buildOneBankerPoolsMatches(
  visibleMatches: string[],
  groupAMatches: Array<string | number>,
): Record<string, string[]> {
  const groupA = groupAMatches.map(String);
  const groupASet = new Set(groupA);
  return {
    "1-groupA": groupA,
    "1-groupB": visibleMatches.filter((n) => !groupASet.has(n)),
  };
}

export function buildTwoBankerLottoNumbers(
  visibleNumbers: number[],
  groupAU: number,
  groupANumbers: Array<string | number>,
  totalUnder: number,
): Record<string, number[]> {
  const groupA = groupANumbers.map(Number).filter((n) => Number.isFinite(n));
  const groupASet = new Set(groupA);
  const groupBU = totalUnder - groupAU;
  return {
    [`${groupAU}-groupA`]: groupA,
    [`${groupBU}-groupB`]: visibleNumbers.filter((n) => !groupASet.has(n)),
  };
}

export function buildOneBankerLottoNumbers(
  visibleNumbers: number[],
  groupANumbers: Array<string | number>,
): Record<string, number[]> {
  const groupA = groupANumbers.map(Number).filter((n) => Number.isFinite(n));
  const groupASet = new Set(groupA);
  return {
    "1-groupA": groupA,
    "1-groupB": visibleNumbers.filter((n) => !groupASet.has(n)),
  };
}

function sameStringLists(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function sameNumberLists(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((value, index) => value === sortedB[index]);
}

/**
 * Removes Group A bankers from Group B for stored pools banker bets.
 * Returns null when the payload is not a banker A/B object.
 */
export function repairOverlappingPoolsBankerMatches(
  matches: unknown,
): { next: Record<string, string[]>; changed: boolean } | null {
  if (!matches || typeof matches !== "object" || Array.isArray(matches)) return null;

  const record = matches as Record<string, unknown>;
  const groupAKey = Object.keys(record).find((key) => /groupA$/i.test(key));
  const groupBKey = Object.keys(record).find((key) => /groupB$/i.test(key));
  if (!groupAKey || !groupBKey) return null;

  const rawA = record[groupAKey];
  const rawB = record[groupBKey];
  if (!Array.isArray(rawA) || !Array.isArray(rawB)) return null;

  const groupA = rawA.map(String);
  const groupASet = new Set(groupA);
  const board = Array.from(new Set([...rawA, ...rawB].map(String)));
  const groupB = board.filter((n) => !groupASet.has(n));

  const next: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === groupAKey) {
      next[key] = groupA;
    } else if (key === groupBKey) {
      next[key] = groupB;
    } else if (Array.isArray(value)) {
      next[key] = value.map(String);
    }
  }

  const prevA = rawA.map(String);
  const prevB = rawB.map(String);
  const changed = !sameStringLists(prevA, groupA) || !sameStringLists(prevB, groupB);
  return { next, changed };
}

/**
 * Removes Group A bankers from Group B for stored lotto banker bets.
 * Returns null when the payload is not a banker A/B object.
 */
export function repairOverlappingLottoBankerNumbers(
  numbers: unknown,
): { next: Record<string, number[]>; changed: boolean } | null {
  if (!numbers || typeof numbers !== "object" || Array.isArray(numbers)) return null;

  const record = numbers as Record<string, unknown>;
  const groupAKey = Object.keys(record).find((key) => /groupA$/i.test(key));
  const groupBKey = Object.keys(record).find((key) => /groupB$/i.test(key));
  if (!groupAKey || !groupBKey) return null;

  const rawA = record[groupAKey];
  const rawB = record[groupBKey];
  if (!Array.isArray(rawA) || !Array.isArray(rawB)) return null;

  const groupA = rawA.map(Number).filter((n) => Number.isFinite(n));
  const groupASet = new Set(groupA);
  const board = Array.from(
    new Set(
      [...rawA, ...rawB]
        .map(Number)
        .filter((n) => Number.isFinite(n)),
    ),
  );
  const groupB = board.filter((n) => !groupASet.has(n));

  const next: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === groupAKey) {
      next[key] = groupA;
    } else if (key === groupBKey) {
      next[key] = groupB;
    } else if (Array.isArray(value)) {
      next[key] = value.map(Number).filter((n) => Number.isFinite(n));
    }
  }

  const prevA = rawA.map(Number).filter((n) => Number.isFinite(n));
  const prevB = rawB.map(Number).filter((n) => Number.isFinite(n));
  const changed = !sameNumberLists(prevA, groupA) || !sameNumberLists(prevB, groupB);
  return { next, changed };
}
