export type TerminalPrizeStatus = "active" | "inactive";

/** Shape stored on `terminal.prizes` in the database. */
export type TerminalPrizeDbRow = {
  prize_id: string;
  commission: number;
  status: TerminalPrizeStatus;
  /** Exactly one active prize per terminal should have default: true. */
  default: boolean;
};

export type TerminalPrizeEntry = TerminalPrizeDbRow;

export function normalizeTerminalPrizeEntries(
  prizes: unknown,
  legacyDefaultPrizeId?: string | null
): TerminalPrizeEntry[] {
  const raw = Array.isArray(prizes)
    ? prizes
    : prizes &&
        typeof prizes === "object" &&
        "prizes" in prizes &&
        Array.isArray((prizes as { prizes: unknown }).prizes)
      ? (prizes as { prizes: unknown[] }).prizes
      : [];

  const entries: TerminalPrizeEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as {
      prize_id?: string;
      commission?: number;
      status?: string;
      default?: boolean;
      name?: string;
    };
    if (!row.prize_id) continue;
    entries.push({
      prize_id: String(row.prize_id),
      commission: Math.min(100, Math.max(0, Number(row.commission) || 0)),
      status: row.status === "inactive" ? "inactive" : "active",
      default: row.default === true,
    });
  }

  if (entries.length === 0) return entries;

  const hasExplicitDefault = entries.some((e) => e.default);
  if (!hasExplicitDefault && legacyDefaultPrizeId) {
    return enforceSingleDefault(entries, legacyDefaultPrizeId);
  }
  if (!hasExplicitDefault) {
    return enforceSingleDefault(entries);
  }
  return enforceSingleDefault(entries);
}

/** Exactly one active prize has default: true; all others default: false. */
export function enforceSingleDefault(
  entries: TerminalPrizeEntry[],
  preferredDefaultPrizeId?: string | null
): TerminalPrizeDbRow[] {
  const active = entries.filter(isTerminalPrizeActive);
  let defaultId: string | null = null;

  if (active.length > 0) {
    if (
      preferredDefaultPrizeId &&
      active.some((p) => p.prize_id === preferredDefaultPrizeId)
    ) {
      defaultId = preferredDefaultPrizeId;
    } else {
      const flagged = entries.find((e) => e.default && isTerminalPrizeActive(e));
      defaultId = flagged?.prize_id ?? active[0].prize_id;
    }
  }

  return entries.map((entry) => ({
    prize_id: entry.prize_id,
    commission: entry.commission,
    status: entry.status,
    default:
      defaultId !== null &&
      isTerminalPrizeActive(entry) &&
      entry.prize_id === defaultId,
  }));
}

/** Normalize and emit the canonical DB payload (status + single default). */
export function serializeTerminalPrizesForDb(
  prizes: unknown,
  legacyDefaultPrizeId?: string | null
): TerminalPrizeDbRow[] {
  const normalized = normalizeTerminalPrizeEntries(prizes, legacyDefaultPrizeId);
  return enforceSingleDefault(normalized);
}

export function getDefaultTerminalPrizeId(prizes: unknown): string | null {
  const entry = normalizeTerminalPrizeEntries(prizes).find(
    (p) => p.default && isTerminalPrizeActive(p)
  );
  return entry?.prize_id ?? null;
}

export function isTerminalPrizeActive(entry: TerminalPrizeEntry): boolean {
  return entry.status !== "inactive";
}

/** Commission from terminal row when active; otherwise fallback (e.g. master prize). */
export function resolveTerminalPrizeCommission(
  terminalPrizes: unknown,
  prizeId: string | null | undefined,
  fallback: number
): number {
  if (!prizeId) return fallback;
  const match = normalizeTerminalPrizeEntries(terminalPrizes).find(
    (p) => p.prize_id === prizeId
  );
  if (!match || !isTerminalPrizeActive(match)) {
    return fallback;
  }
  return Number.isFinite(match.commission) ? match.commission : fallback;
}

export function getActiveTerminalPrizeIds(entries: TerminalPrizeEntry[]): string[] {
  return entries.filter(isTerminalPrizeActive).map((p) => p.prize_id);
}

export function buildTerminalPrizesPayload(body: {
  prizes?: unknown;
  default_prize_id?: string | null;
}): { prizes: TerminalPrizeDbRow[] } {
  return {
    prizes: serializeTerminalPrizesForDb(body.prizes ?? [], body.default_prize_id),
  };
}

export function mergeGamePrizesIntoTerminalPrizes(
  existing: TerminalPrizeEntry[],
  gamePrizes: Array<{ id: string; status?: string; commission?: number }>
): TerminalPrizeEntry[] {
  const gameActive = gamePrizes.filter((p) => p.status !== "inactive");
  const existingById = new Map(existing.map((p) => [p.prize_id, p]));
  const previousDefaultId = existing.find((p) => p.default)?.prize_id ?? null;

  const merged = gameActive.map((gp) => {
    const prev = existingById.get(gp.id);
    const commission = Math.min(
      100,
      Math.max(0, Number(gp.commission) || prev?.commission || 100)
    );
    const status: TerminalPrizeStatus =
      prev?.status === "inactive" ? "inactive" : "active";
    return {
      prize_id: gp.id,
      commission,
      status,
      default: false,
    };
  });

  const stillValidDefault =
    previousDefaultId &&
    merged.some(
      (p) => p.prize_id === previousDefaultId && isTerminalPrizeActive(p)
    );

  return enforceSingleDefault(
    merged,
    stillValidDefault ? previousDefaultId : undefined
  );
}
