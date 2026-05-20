import { SupabaseClient } from "@supabase/supabase-js";
import { AdminRoleInfo, getManagedTerminalIds } from "@/lib/admin/role";
import { canVoidBetWithinWindow, voidWindowExpiredMessage } from "@/lib/bets/voidWindow";

export type VoidableBetTable =
  | "bets_lotto"
  | "bets_pools"
  | "bets_sport"
  | "bets_sports_draw";

interface VoidBetResult {
  ok: true;
  data: Record<string, unknown>;
}

interface VoidBetError {
  ok: false;
  status: number;
  error: string;
}

export async function voidBetForRole(
  supabase: SupabaseClient,
  roleInfo: AdminRoleInfo,
  table: VoidableBetTable,
  betId: string
): Promise<VoidBetResult | VoidBetError> {
  const { data: existingBet, error: fetchError } = await supabase
    .from(table)
    .select("*, games:game_id (void_window_minutes)")
    .eq("id", betId)
    .single();

  if (fetchError || !existingBet) {
    return { ok: false, status: 404, error: "Bet not found" };
  }

  if (roleInfo.role !== "admin") {
    const terminalIds = await getManagedTerminalIds(roleInfo);
    const betTerminal = existingBet.terminal as string | null | undefined;
    if (!betTerminal || !terminalIds?.includes(betTerminal)) {
      return { ok: false, status: 403, error: "Unauthorized" };
    }
  }

  const voidWindowMinutes =
    (existingBet.games as { void_window_minutes?: number | null } | null)?.void_window_minutes ?? null;

  const betTime = (existingBet.bet_time as string | null) ?? (existingBet.created_at as string | null);

  if (!canVoidBetWithinWindow(betTime, voidWindowMinutes)) {
    const message =
      voidWindowMinutes != null && voidWindowMinutes > 0
        ? voidWindowExpiredMessage(voidWindowMinutes)
        : "This bet can no longer be voided.";
    return { ok: false, status: 403, error: message };
  }

  const { data, error } = await supabase
    .from(table)
    .update({
      status: "void",
      award: existingBet.staked,
      updated_at: new Date().toISOString(),
    })
    .eq("id", betId)
    .select("*")
    .single();

  if (error) {
    console.error("Error voiding bet:", error);
    return { ok: false, status: 500, error: "Failed to void bet" };
  }

  return { ok: true, data };
}
