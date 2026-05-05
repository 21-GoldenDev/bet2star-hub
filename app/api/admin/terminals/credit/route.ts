import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getAdminRoleFromRequest,
  getManagedTerminalIds,
  AdminRoleInfo,
} from "@/lib/admin/role";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function getTerminalIds(roleInfo: AdminRoleInfo) {
  if (roleInfo.role === "admin") {
    return null;
  }

  return await getManagedTerminalIds(roleInfo);
}

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    }

    const terminalIds = await getTerminalIds(roleInfo);
    const terminalQuery = supabase.from("terminal").select("id, credit_limit");

    const { data: terminals, error: selectError } = terminalIds
      ? await terminalQuery.in("id", terminalIds)
      : await terminalQuery;

    if (selectError) {
      throw selectError;
    }

    const terminalRows = terminals || [];
    if (terminalRows.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    let updatedCount = 0;

    await Promise.all(
      terminalRows.map(async (terminal: any) => {
        const currentCredit = Number(terminal.credit_limit || 0);
        const { data: updated, error: updateError } = await supabase
          .from("terminal")
          .update({ credit_limit: currentCredit + amount })
          .eq("id", terminal.id)
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (updated?.length) {
          updatedCount += 1;
        }
      })
    );

    return NextResponse.json({ updated: updatedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add terminal credits." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const terminalIds = await getTerminalIds(roleInfo);
    let query = supabase.from("terminal").update({ credit_limit: 0 }).neq("credit_limit", 0);

    if (terminalIds) {
      if (terminalIds.length === 0) {
        return NextResponse.json({ updated: 0 });
      }
      query = query.in("id", terminalIds);
    }

    const { data, error } = await query.select("id");
    if (error) {
      throw error;
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to clear terminal credits." }, { status: 500 });
  }
}
