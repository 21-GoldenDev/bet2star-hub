import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/service";
import { DEFAULT_MAX_WIN_AMOUNT } from "@/lib/bets/capWinAmount";

const SETTINGS_ID = "general";

function isMissingColumnError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

/** Read platform max winning amount (Naira) for sports / sports-draw payouts. */
export async function readMaxWinAmount(
  client?: SupabaseClient,
): Promise<number> {
  const supabase = client ?? getServiceClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("max_win_amount")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return DEFAULT_MAX_WIN_AMOUNT;
    }
    throw error;
  }

  const value = Number(data?.max_win_amount);
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_MAX_WIN_AMOUNT;
  }
  return value;
}
