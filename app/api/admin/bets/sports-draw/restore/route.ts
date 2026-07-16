import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { calculateBetReward } from "@/lib/helpers";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";
import { NextRequest, NextResponse } from "next/server";

function extractSportsDrawOddsMap(prizeIds: any): Record<number, number> {
  if (!prizeIds || typeof prizeIds !== "object" || Array.isArray(prizeIds)) return {};
  const entries = Array.isArray(prizeIds.draw_odds) ? prizeIds.draw_odds : [];
  return entries.reduce((acc: Record<number, number>, item: any) => {
    const matchNumber = Number(item?.match_number);
    const odd = Number(item?.odd);
    if (Number.isFinite(matchNumber) && matchNumber > 0 && Number.isFinite(odd) && odd >= 0) {
      acc[matchNumber] = odd;
    }
    return acc;
  }, {});
}

function applySportsDrawOdds(matches: any[], oddsMap: Record<number, number>): any[] {
  if (!oddsMap || Object.keys(oddsMap).length === 0) return matches;
  return (matches || []).map((match: any) => {
    const matchNumber = Number(match?.number);
    const drawOdd = oddsMap[matchNumber];
    if (!Number.isFinite(drawOdd) || drawOdd < 0) return match;

    const prizes = Array.isArray(match?.prizes) ? [...match.prizes] : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    prizes[1] = drawOdd;
    return { ...match, prizes };
  });
}

// Removed resolveSportsSourceGameId function - sports_draw now manages its own matches

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

    const { data: bet, error: fetchError } = await supabase
      .from("bets_sports_draw")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !bet) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    const { data: drawGame, error: gameError } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", bet.game_id)
      .single();

    if (gameError || !drawGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Fetch matches directly from the sports_draw game
    const { data: matches, error: matchesError } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", bet.game_id);

    if (matchesError) {
      return NextResponse.json({ error: "Matches not found" }, { status: 404 });
    }

    const drawOddsMap = extractSportsDrawOddsMap(drawGame.prize_ids);
    const normalizedMatches = applySportsDrawOdds(matches || [], drawOddsMap);
    const maxWinAmount = await readMaxWinAmount(supabase);
    const award = calculateBetReward(
      { ...bet, status: "active" },
      normalizedMatches,
      true,
      maxWinAmount,
    );

    const { error } = await supabase
      .from("bets_sports_draw")
      .update({
        status: "active",
        award,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error restoring sports draw bet:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
