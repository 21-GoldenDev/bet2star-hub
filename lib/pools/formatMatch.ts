export function formatPoolsMatchEvent(
  number: string | number,
  home?: string | null,
  away?: string | null,
): string {
  const n = String(number);
  const homeName = home?.trim();
  const awayName = away?.trim();
  if (!homeName && !awayName) return n;
  return `${n}. ${homeName || "TBD"} vs ${awayName || "TBD"}`;
}

export function buildPoolsMatchLabels(
  matches: Array<{ number: number | string; home?: string | null; away?: string | null }>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const match of matches) {
    const key = String(match.number);
    labels[key] = formatPoolsMatchEvent(match.number, match.home, match.away);
  }
  return labels;
}

export function poolsMatchLabel(match: string, labels?: Record<string, string>): string {
  return labels?.[match] ?? match;
}
