import { NextRequest, NextResponse } from "next/server";
import {
  initializePayment,
  generatePaymentReference,
} from "@/lib/payments/monnify";
import { createSupabaseServer } from "@/lib/supabase/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, customerName } = body;

    if (!email || amount === undefined || amount === null) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Email and amount are required" },
          { status: 400 }
        )
      );
    }

    const nairaAmount = Number(amount);
    if (!Number.isFinite(nairaAmount) || nairaAmount < 100) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Minimum amount is ₦100" },
          { status: 400 }
        )
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return addCORSHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (user.email !== email) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Email does not match authenticated user" },
          { status: 400 }
        )
      );
    }

    const reference = generatePaymentReference("DEP");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    const result = await initializePayment({
      email,
      amount: nairaAmount,
      name: customerName || user.user_metadata?.full_name || email.split("@")[0],
      paymentReference: reference,
      redirectUrl: siteUrl
        ? `${siteUrl}/payment-status?reference=${reference}`
        : undefined,
      paymentDescription: "Wallet deposit",
      metaData: {
        type: "deposit",
        userId: user.id,
      },
    });

    if (!result.success) {
      return addCORSHeaders(
        NextResponse.json({ error: result.error }, { status: 500 })
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      profile_id: profile?.id ?? null,
      type: "deposit",
      amount: nairaAmount,
      status: "pending",
      reference,
      payment_method: "monnify",
      metadata: {
        type: "deposit",
        transactionReference: result.data.transactionReference,
      },
    });

    if (txError) {
      console.error("Transaction record error:", txError);
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: {
          reference,
          paymentReference: result.data.paymentReference,
          transactionReference: result.data.transactionReference,
          checkoutUrl: result.data.checkoutUrl,
          amount: nairaAmount,
        },
      })
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize payment";
    console.error("Initialize payment error:", error);
    return addCORSHeaders(
      NextResponse.json({ error: message }, { status: 500 })
    );
  }
}
