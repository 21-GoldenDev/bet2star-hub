import { NextResponse } from "next/server";
import { readDepositBankDetails } from "@/lib/depositBankDetails.server";
import { getValidBanks } from "@/lib/depositBankDetails.shared";

export async function GET() {
  try {
    const config = await readDepositBankDetails();
    return NextResponse.json({ banks: getValidBanks(config.banks) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load deposit bank details.";
    console.error("Public deposit bank GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
