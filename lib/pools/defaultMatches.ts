export const POOLS_MATCH_COUNT = 49;

export type PoolsMatchTemplate = {
  number: number;
  home: string;
  away: string;
};

export type PoolsMatchRecord = {
  id: string;
  number: number;
  home: string;
  away: string;
  status: "enable" | "disable";
  week: number;
  created_at?: string;
};

export function buildDefaultPoolsMatches(
  week: number,
  templates: PoolsMatchTemplate[] = [],
): Array<{
  number: number;
  home: string;
  away: string;
  status: "enable";
  week: number;
}> {
  const templateByNumber = new Map(
    templates.map((match) => [match.number, match]),
  );

  return Array.from({ length: POOLS_MATCH_COUNT }, (_, index) => {
    const number = index + 1;
    const template = templateByNumber.get(number);

    return {
      number,
      home: template?.home?.trim() || `Home Team ${number}`,
      away: template?.away?.trim() || `Away Team ${number}`,
      status: "enable" as const,
      week,
    };
  });
}

export function dedupePoolsMatchesByNumber<T extends { number: number; created_at?: string }>(
  matches: T[],
): T[] {
  const byNumber = new Map<number, T>();

  for (const match of matches) {
    const existing = byNumber.get(match.number);
    if (
      !existing ||
      (match.created_at &&
        (!existing.created_at || match.created_at > existing.created_at))
    ) {
      byNumber.set(match.number, match);
    }
  }

  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}
