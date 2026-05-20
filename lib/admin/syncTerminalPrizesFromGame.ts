import type { SupabaseClient } from "@supabase/supabase-js";

export type GamePrizeEntry = {
  id: string;
  status?: "active" | "inactive";
  commission?: number;
};

export function normalizeGamePrizeEntries(prizeIds: unknown): GamePrizeEntry[] {
  if (!Array.isArray(prizeIds)) return [];
  const entries: GamePrizeEntry[] = [];
  for (const entry of prizeIds) {
    if (typeof entry === "string") {
      entries.push({ id: entry, status: "active", commission: 100 });
      continue;
    }
    if (entry && typeof entry === "object" && "id" in entry) {
      const raw = entry as { id: string; status?: string; commission?: number };
      entries.push({
        id: String(raw.id),
        status: raw.status === "inactive" ? "inactive" : "active",
        commission:
          typeof raw.commission === "number" && !Number.isNaN(raw.commission)
            ? raw.commission
            : 100,
      });
    }
  }
  return entries;
}

export function gamePrizesToTerminalPrizes(
  prizes: GamePrizeEntry[]
): Array<{ prize_id: string; commission: number }> {
  return prizes
    .filter((p) => p.status !== "inactive")
    .map((p) => ({
      prize_id: p.id,
      commission: Math.min(100, Math.max(0, Number(p.commission) || 100)),
    }));
}

/** Push active game prizes (with commission) to every terminal. */
export async function syncAllTerminalsPrizesFromGame(
  supabase: SupabaseClient,
  gamePrizes: GamePrizeEntry[]
): Promise<{ error: Error | null }> {
  const terminalPrizes = gamePrizesToTerminalPrizes(gamePrizes);

  const { error } = await supabase
    .from("terminal")
    .update({ prizes: terminalPrizes })
    .not("id", "is", null);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export function validateCommission(commission: unknown): commission is number {
  return (
    typeof commission === "number" &&
    !Number.isNaN(commission) &&
    commission >= 0 &&
    commission <= 100
  );
}
