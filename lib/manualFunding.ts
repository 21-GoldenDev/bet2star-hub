import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generatePaymentReference } from "@/lib/payments/reference";
import { getServiceClient } from "@/lib/supabase/service";
import {
  MANUAL_PAYMENT_METHOD,
  type ManualFundingStatus,
  type ManualFundingAttachment,
} from "@/lib/manualFunding.types";

export { MANUAL_PAYMENT_METHOD, type ManualFundingStatus, type ManualFundingAttachment };
export { getServiceClient };

export function generateManualReference(type: "deposit" | "withdrawal") {
  return generatePaymentReference(type === "deposit" ? "MDEP" : "MWTH");
}

export async function updateManualFundingStatus(
  supabase: SupabaseClient,
  transactionId: string,
  newStatus: ManualFundingStatus,
  adminEmail?: string
) {
  const { data: tx, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("payment_method", MANUAL_PAYMENT_METHOD)
    .single();

  if (fetchError || !tx) {
    return { ok: false as const, status: 404, error: "Request not found" };
  }

  if (tx.status !== "pending") {
    return { ok: false as const, status: 400, error: "Only pending requests can be updated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", tx.user_id)
    .single();

  if (profileError || !profile) {
    return { ok: false as const, status: 404, error: "User profile not found" };
  }

  const amount = Number(tx.amount) || 0;
  const currentBalance = Number(profile.balance) || 0;
  let newBalance = currentBalance;

  if (newStatus === "completed") {
    if (tx.type === "deposit") {
      newBalance = currentBalance + amount;
    }
  } else if (newStatus === "cancelled") {
    if (tx.type === "withdrawal") {
      newBalance = currentBalance + amount;
    }
  }

  if (newStatus === "completed" || newStatus === "cancelled") {
    const needsBalanceUpdate =
      (newStatus === "completed" && tx.type === "deposit") ||
      (newStatus === "cancelled" && tx.type === "withdrawal");

    if (needsBalanceUpdate) {
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", tx.user_id);

      if (balanceError) {
        return { ok: false as const, status: 500, error: "Failed to update balance" };
      }
    }
  }

  const existingMetadata =
    tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {};

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update({
      status: newStatus,
      metadata: {
        ...existingMetadata,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminEmail || null,
      },
    })
    .eq("id", transactionId)
    .select("*")
    .single();

  if (updateError) {
    return { ok: false as const, status: 500, error: "Failed to update request" };
  }

  return { ok: true as const, data: updated };
}
