import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreditDepositResult {
  alreadyCompleted: boolean;
  amount: number;
  newBalance: number;
  reference: string;
  userId: string;
  profileId: string;
}

/**
 * Idempotently complete a pending deposit and credit profiles.balance.
 * Claims the pending row first so verify + webhook cannot double-credit.
 */
export async function creditCompletedDeposit(
  supabase: SupabaseClient,
  params: {
    reference: string;
    amount: number;
    paymentChannel?: string | null;
    metadata?: Record<string, unknown>;
    /** When provided, only credit this user's pending tx */
    userId?: string;
  }
): Promise<CreditDepositResult | null> {
  let lookup = supabase
    .from("transactions")
    .select("id, user_id, profile_id, status, amount")
    .eq("reference", params.reference)
    .eq("type", "deposit");

  if (params.userId) {
    lookup = lookup.eq("user_id", params.userId);
  }

  const { data: existingTx, error: txError } = await lookup.maybeSingle();

  if (txError) {
    console.error("Deposit lookup error:", txError);
    throw new Error("Failed to look up deposit transaction");
  }

  if (!existingTx) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, balance")
    .eq("user_id", existingTx.user_id)
    .single();

  if (profileError || !profile) {
    console.error("User profile not found for deposit:", profileError);
    throw new Error("User profile not found");
  }

  if (existingTx.status === "completed") {
    return {
      alreadyCompleted: true,
      amount: Number(existingTx.amount),
      newBalance: profile.balance ?? 0,
      reference: params.reference,
      userId: existingTx.user_id,
      profileId: existingTx.profile_id || profile.id,
    };
  }

  if (existingTx.status !== "pending") {
    return null;
  }

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid deposit amount");
  }

  // Claim pending row first — only one concurrent caller can succeed.
  const { data: claimed, error: claimError } = await supabase
    .from("transactions")
    .update({
      status: "completed",
      profile_id: existingTx.profile_id || profile.id,
      amount,
      payment_channel: params.paymentChannel || null,
      metadata: params.metadata || {},
    })
    .eq("id", existingTx.id)
    .eq("status", "pending")
    .select("id, user_id, profile_id, amount")
    .maybeSingle();

  if (claimError) {
    console.error("Transaction claim error:", claimError);
    throw new Error("Failed to mark deposit completed");
  }

  if (!claimed) {
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", profile.id)
      .maybeSingle();

    return {
      alreadyCompleted: true,
      amount,
      newBalance: refreshed?.balance ?? profile.balance ?? 0,
      reference: params.reference,
      userId: existingTx.user_id,
      profileId: profile.id,
    };
  }

  const newBalance = (profile.balance || 0) + amount;
  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", profile.id);

  if (balanceError) {
    console.error("Balance update error:", balanceError);
    // Roll claim back so webhook/verify can retry.
    await supabase
      .from("transactions")
      .update({ status: "pending" })
      .eq("id", claimed.id);
    throw new Error("Failed to update balance");
  }

  return {
    alreadyCompleted: false,
    amount,
    newBalance,
    reference: params.reference,
    userId: existingTx.user_id,
    profileId: profile.id,
  };
}
