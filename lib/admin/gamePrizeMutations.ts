import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeGamePrizeEntries,
  syncAllTerminalsPrizesFromGame,
  validateCommission,
} from "@/lib/admin/syncTerminalPrizesFromGame";

export async function syncTerminalsIfPoolsGame(
  supabase: SupabaseClient,
  gameType: string,
  prizeIds: unknown
): Promise<{ error: string | null }> {
  if (gameType !== "pools") {
    return { error: null };
  }
  const prizes = normalizeGamePrizeEntries(prizeIds);
  const { error } = await syncAllTerminalsPrizesFromGame(supabase, prizes);
  return { error: error?.message ?? null };
}

export async function defaultCommissionForPrize(
  supabase: SupabaseClient,
  prizeId: string,
  provided?: number
): Promise<number> {
  if (validateCommission(provided)) {
    return provided;
  }
  const { data } = await supabase
    .from("prize")
    .select("commission")
    .eq("id", prizeId)
    .single();
  const fromMaster = Number(data?.commission);
  return validateCommission(fromMaster) ? fromMaster : 100;
}
