import type { SupabaseClient } from "@supabase/supabase-js";

export async function getNextBetNumber(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("next_bet_number");

  if (error) {
    throw error;
  }

  const nextNumber = Number(data);
  if (!Number.isFinite(nextNumber) || nextNumber < 1) {
    throw new Error("Failed to allocate bet number");
  }

  return nextNumber;
}
