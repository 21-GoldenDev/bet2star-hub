import { NextResponse } from "next/server";
import { readDepositBankDetails } from "@/lib/depositBankDetails.server";

export async function GET() {
  try {
    const details = await readDepositBankDetails();
    return NextResponse.json(details);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load deposit bank details.";
    console.error("Public deposit bank GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
