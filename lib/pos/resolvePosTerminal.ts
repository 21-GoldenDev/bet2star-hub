import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "@/lib/types/gameMode";

export type PosTerminalRow = {
  id: string;
  serial_number: string;
  status: string;
  credit_limit: number;
  max_stake: number | null;
  game_modes: GameType[] | null;
  prizes: unknown;
};

export async function resolvePosTerminal(
  supabase: SupabaseClient,
  tsn: string,
  product: GameType,
  stake: number,
): Promise<PosTerminalRow> {
  const { data: terminal, error } = await supabase
    .from("terminal")
    .select("id, serial_number, status, credit_limit, max_stake, game_modes, prizes")
    .eq("serial_number", tsn)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!terminal) {
    throw new Error("Terminal not found");
  }

  if (terminal.status !== "active") {
    throw new Error("Terminal is inactive");
  }

  const allowed = Array.isArray(terminal.game_modes) ? terminal.game_modes : [];
  if (allowed.length > 0 && !allowed.includes(product)) {
    throw new Error(`Terminal is not allowed to place ${product} bets`);
  }

  const maxStake = Number(terminal.max_stake || 0);
  if (maxStake > 0 && stake > maxStake) {
    throw new Error(`Maximum stake is ${maxStake}`);
  }

  const currentCredit = Number(terminal.credit_limit || 0);
  if (currentCredit < stake) {
    throw new Error("Insufficient terminal credit");
  }

  return {
    ...terminal,
    credit_limit: currentCredit,
    max_stake: terminal.max_stake,
  };
}

export async function deductTerminalCredit(
  supabase: SupabaseClient,
  terminalId: string,
  currentCredit: number,
  stake: number,
  rollback: () => Promise<void>,
): Promise<number> {
  const remaining = currentCredit - stake;
  const { error } = await supabase
    .from("terminal")
    .update({ credit_limit: remaining })
    .eq("id", terminalId);

  if (error) {
    await rollback();
    throw new Error("Failed to deduct terminal credit");
  }

  return remaining;
}
