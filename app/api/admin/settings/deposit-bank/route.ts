import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import {
  readDepositBankDetails,
  writeDepositBankDetails,
} from "@/lib/depositBankDetails.server";
import {
  createEmptyBankAccount,
  isValidBankAccount,
  type DepositBankAccount,
  type DepositBankConfig,
} from "@/lib/depositBankDetails.shared";

function normalizeSavePayload(body: unknown): DepositBankConfig {
  if (!body || typeof body !== "object") {
    return { banks: [] };
  }

  const row = body as Record<string, unknown>;
  const rawBanks = Array.isArray(row.banks) ? row.banks : [];

  const banks = rawBanks
    .map((bank) => {
      if (!bank || typeof bank !== "object") {
        return null;
      }
      const item = bank as Partial<DepositBankAccount>;
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        bankName: (item.bankName || "").trim(),
        accountNumber: (item.accountNumber || "").trim(),
        accountName: (item.accountName || "").trim(),
        note: (item.note || "").trim(),
      };
    })
    .filter((bank): bank is DepositBankAccount => bank !== null);

  return { banks };
}

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const config = await readDepositBankDetails();
    return NextResponse.json({
      banks: config.banks.length > 0 ? config.banks : [createEmptyBankAccount()],
    });
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

    const config = normalizeSavePayload(await request.json());
    const validBanks = config.banks.filter(isValidBankAccount);

    if (validBanks.length === 0) {
      return NextResponse.json(
        { error: "Add at least one bank with bank name, account number, and account name." },
        { status: 400 }
      );
    }

    const saved = await writeDepositBankDetails({ banks: validBanks });
    return NextResponse.json(saved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save deposit bank details.";
    console.error("Admin deposit bank PUT error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
