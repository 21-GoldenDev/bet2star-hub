import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { DEFAULT_MAX_WIN_AMOUNT } from "@/lib/bets/capWinAmount";

const SETTINGS_ID = "general";
const DEFAULT_MAX_BET = 100000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function isMissingColumnError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("platform_settings")
      .select("max_bet_amount, max_win_amount")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error.message)) {
        const { data: betOnly, error: betError } = await supabase
          .from("platform_settings")
          .select("max_bet_amount")
          .eq("id", SETTINGS_ID)
          .maybeSingle();

        if (betError) {
          throw betError;
        }

        return NextResponse.json({
          maxBetAmount: Number(betOnly?.max_bet_amount ?? DEFAULT_MAX_BET),
          maxWinAmount: DEFAULT_MAX_WIN_AMOUNT,
          warning:
            "max_win_amount column is missing. Run the latest database migration.",
        });
      }
      throw error;
    }

    return NextResponse.json({
      maxBetAmount: Number(data?.max_bet_amount ?? DEFAULT_MAX_BET),
      maxWinAmount: Number(data?.max_win_amount ?? DEFAULT_MAX_WIN_AMOUNT),
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
    const maxWinAmount = Number(body.maxWinAmount);

    if (!Number.isFinite(maxBetAmount) || maxBetAmount < 0) {
      return NextResponse.json(
        { error: "Max bet amount must be 0 or greater." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxWinAmount) || maxWinAmount < 0) {
      return NextResponse.json(
        { error: "Max winning amount must be 0 or greater." },
        { status: 400 }
      );
    }

    const { error: settingsError } = await supabase
      .from("platform_settings")
      .upsert({
        id: SETTINGS_ID,
        max_bet_amount: maxBetAmount,
        max_win_amount: maxWinAmount,
        updated_at: new Date().toISOString(),
      });

    if (settingsError) {
      if (isMissingColumnError(settingsError.message)) {
        return NextResponse.json(
          {
            error:
              "max_win_amount column is missing. Run the latest database migration.",
          },
          { status: 500 }
        );
      }
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
      maxWinAmount,
      terminalsUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save settings." },
      { status: 500 }
    );
  }
}
