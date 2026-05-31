import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import {
  readDepositBankDetails,
  writeDepositBankDetails,
} from "@/lib/depositBankDetails.server";
import type { DepositBankDetails } from "@/lib/depositBankDetails.shared";

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const details = await readDepositBankDetails();
    return NextResponse.json(details);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load deposit bank details.";
    console.error("Admin deposit bank GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<DepositBankDetails>;
    const bankName = (body.bankName || "").trim();
    const accountNumber = (body.accountNumber || "").trim();
    const accountName = (body.accountName || "").trim();
    const note = (body.note || "").trim();

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Bank name, account number, and account name are required." },
        { status: 400 }
      );
    }

    const saved = await writeDepositBankDetails({
      bankName,
      accountNumber,
      accountName,
      note,
    });

    return NextResponse.json(saved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save deposit bank details.";
    console.error("Admin deposit bank PUT error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
