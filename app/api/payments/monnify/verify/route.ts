import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, isPaymentPaid } from "@/lib/payments/monnify";
import { creditCompletedDeposit } from "@/lib/payments/creditDeposit";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference =
      searchParams.get("reference") ||
      searchParams.get("paymentReference");

    if (!reference) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Payment reference is required" },
          { status: 400 }
        )
      );
    }

    const verification = await verifyPayment(reference);

    if (!verification.status || !verification.data) {
      return addCORSHeaders(
        NextResponse.json(
          { error: verification.message },
          { status: 400 }
        )
      );
    }

    const paymentData = verification.data;

    if (!isPaymentPaid(paymentData.paymentStatus)) {
      const status = (paymentData.paymentStatus || "pending").toLowerCase();
      return addCORSHeaders(
        NextResponse.json({
          success: false,
          status: status === "paid" ? "pending" : status,
          message: `Payment status: ${paymentData.paymentStatus}`,
        })
      );
    }

    const amount = Number(paymentData.amountPaid ?? paymentData.amount);
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // Prefer session user; if cookies are missing (e.g. wrong redirect host),
    // still credit via service role using the pending transaction row.
    const supabase = user ? supabaseAuth : getServiceClient();

    try {
      const credited = await creditCompletedDeposit(supabase, {
        reference,
        amount,
        userId: user?.id,
        paymentChannel: paymentData.paymentMethod || null,
        metadata: {
          transactionReference: paymentData.transactionReference,
          paidOn: paymentData.paidOn,
          paymentStatus: paymentData.paymentStatus,
          customer: paymentData.customer,
        },
      });

      if (!credited) {
        return addCORSHeaders(
          NextResponse.json({
            success: true,
            status: "pending",
            message:
              "Payment successful but no matching deposit record was found. Please contact support.",
            data: paymentData,
          })
        );
      }

      return addCORSHeaders(
        NextResponse.json({
          success: true,
          status: "success",
          message: credited.alreadyCompleted
            ? "Payment already credited"
            : "Payment verified and balance updated",
          data: {
            reference: credited.reference,
            amount: credited.amount,
            newBalance: credited.newBalance,
            paidAt: paymentData.paidOn,
          },
        })
      );
    } catch (creditError: unknown) {
      console.error("Credit deposit error:", creditError);
      return addCORSHeaders(
        NextResponse.json({
          success: true,
          status: "pending",
          message:
            "Payment successful but balance update pending. Please contact support.",
          data: paymentData,
        })
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    console.error("Verify payment error:", error);
    return addCORSHeaders(
      NextResponse.json({ error: message }, { status: 500 })
    );
  }
}
