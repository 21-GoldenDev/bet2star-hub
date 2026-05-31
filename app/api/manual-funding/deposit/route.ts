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
    const { amount, message, attachments } = body as {
      amount: number;
      message?: string;
      attachments?: ManualFundingAttachment[];
    };

    if (!amount || amount < 100) {
      return NextResponse.json({ error: "Minimum deposit amount is ₦100" }, { status: 400 });
    }

    const trimmedMessage = (message || "").trim();
    if (!trimmedMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reference = generateManualReference("deposit");
    const safeAttachments = Array.isArray(attachments) ? attachments : [];

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "deposit",
        amount,
        status: "pending",
        reference,
        payment_method: MANUAL_PAYMENT_METHOD,
        payment_channel: "manual_transfer",
        metadata: {
          message: trimmedMessage,
          attachments: safeAttachments,
          submitted_by: user.email,
        },
      })
      .select("*")
      .single();

    if (error) {
      console.error("Manual deposit error:", error);
      return NextResponse.json({ error: "Failed to submit deposit request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit deposit request";
    console.error("Manual deposit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
