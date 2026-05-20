import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mergeGamePrizesIntoTerminalPrizes,
  normalizeTerminalPrizeEntries,
  serializeTerminalPrizesForDb,
} from "@/lib/terminals/terminalPrize";

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

/** Push game prizes to every terminal, preserving each terminal's per-prize active/inactive. */
export async function syncAllTerminalsPrizesFromGame(
  supabase: SupabaseClient,
  gamePrizes: GamePrizeEntry[]
): Promise<{ error: Error | null }> {
  const { data: terminals, error: fetchError } = await supabase
    .from("terminal")
    .select("id, prizes");

  if (fetchError) {
    return { error: new Error(fetchError.message) };
  }

  const updates = (terminals || []).map(async (terminal) => {
    const merged = mergeGamePrizesIntoTerminalPrizes(
      normalizeTerminalPrizeEntries(terminal.prizes),
      gamePrizes
    );
    const prizes = serializeTerminalPrizesForDb(merged);
    return supabase.from("terminal").update({ prizes }).eq("id", terminal.id);
  });

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { error: new Error(failed.error.message) };
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
