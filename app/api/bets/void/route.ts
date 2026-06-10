import { NextRequest, NextResponse } from "next/server";
import { betIncludesDisabledMatches } from "@/lib/bets/poolsMatches";
import { getServiceClient } from "@/lib/supabase/service";
import { createSupabaseServer } from "@/lib/supabase/server";

type BetTab = "lotto" | "pools" | "sports" | "sports-draw";

const TABLE_BY_TAB: Record<BetTab, string> = {
  lotto: "bets_lotto",
  pools: "bets_pools",
  sports: "bets_sport",
  "sports-draw": "bets_sports_draw",
};

const isValidTab = (value: unknown): value is BetTab => {
  return value === "lotto" || value === "pools" || value === "sports" || value === "sports-draw";
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tab = body?.tab;
    const id = body?.id;

    if (!isValidTab(tab) || typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const table = TABLE_BY_TAB[tab];

    // Select the bet to ensure it belongs to the user and to get any necessary info for logging or response
    const { data: betData, error: selectError } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("player", user.id)
      .single();

    if (selectError) {
      console.error("Failed to find bet:", selectError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    if (tab === "pools") {
      const serviceClient = getServiceClient();
      const { data: gameData, error: gameError } = await serviceClient
        .from("games")
        .select("week")
        .eq("id", betData.game_id)
        .single();

      if (gameError) {
        console.error("Failed to fetch pools game for bet:", gameError);
        return NextResponse.json({ error: "Failed to validate bet" }, { status: 500 });
      }

      const week = gameData?.week;
      if (typeof week === "number" && Number.isFinite(week)) {
        const { data: disabledMatches, error: disabledMatchesError } = await serviceClient
          .from("matches")
          .select("number")
          .eq("week", week)
          .eq("status", "disable");

        if (disabledMatchesError) {
          console.error("Failed to fetch disabled pool matches:", disabledMatchesError);
          return NextResponse.json({ error: "Failed to validate bet" }, { status: 500 });
        }

        const disabledMatchNumbersByWeek = {
          [week]: (disabledMatches || []).map((match) => match.number),
        };

        if (betIncludesDisabledMatches(betData.matches, week, disabledMatchNumbersByWeek)) {
          return NextResponse.json(
            { error: "This bet cannot be deleted because it includes disabled matches" },
            { status: 403 },
          );
        }
      }
    }

    const { error } = await supabase
      .from(table)
      .update({ status: "void", updated_at: new Date().toISOString(), award: betData.staked })
      .eq("id", id)
      .eq("player", user.id);

    if (error) {
      console.error("Failed to void bet:", error);
      return NextResponse.json({ error: "Failed to void bet" }, { status: 500 });
    }

    return NextResponse.json({ message: "Bet voided successfully" });
  } catch (error) {
    console.error("Void bet API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
