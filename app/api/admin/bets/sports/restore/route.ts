import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { calculateBetReward } from "@/lib/helpers";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServer();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Bet ID is required" }, { status: 400 });
    }

    // Fetch the bet with all necessary data
    const { data: bet, error: fetchError } = await supabase
      .from("bets_sport")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !bet) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    // Fetch all matches for this game
    const { data: matches, error: matchesError } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", bet.game_id);

    if (matchesError) {
      console.error("Matches fetch error:", matchesError);
      return NextResponse.json({ error: "Matches not found" }, { status: 404 });
    }

    // Recalculate award based on current match results
    const maxWinAmount = await readMaxWinAmount(supabase);
    const award = calculateBetReward(
      { ...bet, status: "active" },
      matches || [],
      false,
      maxWinAmount,
    );

    // Update bet: restore status and recalculated award
    const { error } = await supabase
      .from("bets_sport")
      .update({
        status: "active",
        award: award,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
