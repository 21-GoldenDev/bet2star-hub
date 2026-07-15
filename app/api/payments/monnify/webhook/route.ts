import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  isPaymentPaid,
} from "@/lib/payments/monnify";
import { creditCompletedDeposit } from "@/lib/payments/creditDeposit";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("monnify-signature");

    if (!verifyWebhookSignature(body, signature)) {
      console.error("Invalid Monnify webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.eventType as string | undefined;
    const data = payload.eventData || payload;

    console.log("Monnify webhook event:", eventType);

    if (
      eventType === "SUCCESSFUL_TRANSACTION" ||
      isPaymentPaid(data?.paymentStatus)
    ) {
      await handleSuccessfulTransaction(data);
    } else {
      console.log("Unhandled Monnify event type:", eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Monnify webhook error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleSuccessfulTransaction(data: {
  paymentReference?: string;
  amountPaid?: number;
  amount?: number;
  paymentMethod?: string;
  paidOn?: string;
  transactionReference?: string;
  paymentStatus?: string;
  customer?: unknown;
}) {
  const reference = data.paymentReference;
  if (!reference) {
    console.error("Webhook missing paymentReference");
    return;
  }

  const amount = Number(data.amountPaid ?? data.amount);
  const supabase = getServiceClient();

  try {
    const credited = await creditCompletedDeposit(supabase, {
      reference,
      amount,
      paymentChannel: data.paymentMethod || null,
      metadata: {
        transactionReference: data.transactionReference,
        paidOn: data.paidOn,
        paymentStatus: data.paymentStatus,
        customer: data.customer,
        source: "webhook",
      },
    });

    if (!credited) {
      console.error("Transaction not found in webhook:", reference);
      return;
    }

    if (credited.alreadyCompleted) {
      console.log("Transaction already processed:", reference);
      return;
    }

    console.log("Deposit processed via Monnify webhook:", reference);
  } catch (error) {
    console.error("Error handling SUCCESSFUL_TRANSACTION:", error);
  }
}
