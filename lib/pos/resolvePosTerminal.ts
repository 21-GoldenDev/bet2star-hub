import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "@/lib/types/gameMode";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";

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
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  if (!terminal) {
    throw new PosError(POS_ERROR_CODES.TERMINAL_NOT_FOUND, "Terminal not found");
  }

  if (terminal.status !== "active") {
    throw new PosError(POS_ERROR_CODES.TERMINAL_INACTIVE, "Terminal is inactive.");
  }

  const allowed = Array.isArray(terminal.game_modes) ? terminal.game_modes : [];
  if (allowed.length > 0 && !allowed.includes(product)) {
    throw new PosError(
      POS_ERROR_CODES.PRODUCT_NOT_ALLOWED,
      `Terminal is not allowed to place ${product} bets`,
      { product, allowed_products: allowed },
    );
  }

  const maxStake = Number(terminal.max_stake || 0);
  if (maxStake > 0 && stake > maxStake) {
    throw new PosError(
      POS_ERROR_CODES.MAX_STAKE_EXCEEDED,
      `Maximum stake is ${maxStake}`,
      { max_stake: maxStake, stake },
    );
  }

  const currentCredit = Number(terminal.credit_limit || 0);
  if (currentCredit < stake) {
    throw new PosError(
      POS_ERROR_CODES.INSUFFICIENT_CREDIT,
      "Insufficient terminal credit",
      { credit_limit: currentCredit, stake },
    );
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
    throw new PosError(
      POS_ERROR_CODES.CREDIT_DEDUCT_FAILED,
      "Failed to deduct terminal credit",
    );
  }

  return remaining;
}
