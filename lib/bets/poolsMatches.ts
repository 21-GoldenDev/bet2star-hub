export function resolvePoolsBetWeek(bet: { games?: unknown }): number | null {
  const games = bet.games;

  if (Array.isArray(games)) {
    const week = games[0] && typeof games[0] === "object"
      ? (games[0] as { week?: unknown }).week
      : undefined;
    return typeof week === "number" && Number.isFinite(week) ? week : null;
  }

  if (games && typeof games === "object") {
    const week = (games as { week?: unknown }).week;
    return typeof week === "number" && Number.isFinite(week) ? week : null;
  }

  return null;
}

export function extractPoolsMatchNumbers(matches: unknown): number[] {
  if (Array.isArray(matches)) {
    return matches
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  if (matches && typeof matches === "object") {
    const numbers: number[] = [];

    for (const items of Object.values(matches as Record<string, unknown>)) {
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const value = Number(item);
        if (Number.isFinite(value)) {
          numbers.push(value);
        }
      }
    }

    return numbers;
  }

  return [];
}

export function betIncludesDisabledMatches(
  matches: unknown,
  week: number,
  disabledMatchNumbersByWeek: Record<number, number[]>,
): boolean {
  if (!Number.isFinite(week)) return false;

  const disabledNumbers = disabledMatchNumbersByWeek[week] || [];
  if (disabledNumbers.length === 0) return false;

  const disabledSet = new Set(disabledNumbers);
  const betNumbers = extractPoolsMatchNumbers(matches);

  return betNumbers.some((number) => disabledSet.has(number));
}
