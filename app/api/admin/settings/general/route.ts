import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";

const SETTINGS_ID = "general";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("platform_settings")
      .select("max_bet_amount")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      maxBetAmount: Number(data?.max_bet_amount ?? 100000),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const maxBetAmount = Number(body.maxBetAmount);

    if (!Number.isFinite(maxBetAmount) || maxBetAmount <= 0) {
      return NextResponse.json(
        { error: "Max bet amount must be a positive number." },
        { status: 400 }
      );
    }

    const { error: settingsError } = await supabase
      .from("platform_settings")
      .upsert({
        id: SETTINGS_ID,
        max_bet_amount: maxBetAmount,
        updated_at: new Date().toISOString(),
      });

    if (settingsError) {
      throw settingsError;
    }

    const { data: terminals, error: selectError } = await supabase
      .from("terminal")
      .select("id");

    if (selectError) {
      throw selectError;
    }

    const terminalIds = (terminals || [])
      .map((t: { id: string }) => t.id)
      .filter(Boolean);

    let terminalsUpdated = 0;

    if (terminalIds.length > 0) {
      const { data: updatedTerminals, error: terminalsError } = await supabase
        .from("terminal")
        .update({ max_stake: maxBetAmount })
        .in("id", terminalIds)
        .select("id");

      if (terminalsError) {
        throw terminalsError;
      }

      terminalsUpdated = updatedTerminals?.length ?? 0;
    }

    return NextResponse.json({
      maxBetAmount,
      terminalsUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save settings." },
      { status: 500 }
    );
  }
}
