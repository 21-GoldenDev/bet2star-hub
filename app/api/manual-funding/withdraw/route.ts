import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  generateManualReference,
  MANUAL_PAYMENT_METHOD,
  type ManualFundingAttachment,
} from "@/lib/manualFunding";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, message, accountNumber, accountName, bankName, attachments } = body as {
      amount: number;
      message?: string;
      accountNumber?: string;
      accountName?: string;
      bankName?: string;
      attachments?: ManualFundingAttachment[];
    };

    if (!amount || amount < 100) {
      return NextResponse.json({ error: "Minimum withdrawal amount is ₦100" }, { status: 400 });
    }

    const trimmedMessage = (message || "").trim();

    const trimmedAccountNumber = (accountNumber || "").trim();
    const trimmedAccountName = (accountName || "").trim();
    const trimmedBankName = (bankName || "").trim();

    if (!trimmedAccountNumber || !trimmedAccountName || !trimmedBankName) {
      return NextResponse.json(
        { error: "Bank name, account number, and account name are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const currentBalance = Number(profile.balance) || 0;
    if (currentBalance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const reference = generateManualReference("withdrawal");
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    const newBalance = currentBalance - amount;

    const { error: balanceError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", user.id);

    if (balanceError) {
      return NextResponse.json({ error: "Failed to reserve withdrawal amount" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount,
        status: "pending",
        reference,
        payment_method: MANUAL_PAYMENT_METHOD,
        payment_channel: "manual_transfer",
        metadata: {
          message: trimmedMessage,
          attachments: safeAttachments,
          submitted_by: user.email,
          account_number: trimmedAccountNumber,
          account_name: trimmedAccountName,
          bank_name: trimmedBankName,
        },
      })
      .select("*")
      .single();

    if (error) {
      await supabase
        .from("profiles")
        .update({ balance: currentBalance })
        .eq("user_id", user.id);

      console.error("Manual withdrawal error:", error);
      return NextResponse.json({ error: "Failed to submit withdrawal request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit withdrawal request";
    console.error("Manual withdrawal error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
