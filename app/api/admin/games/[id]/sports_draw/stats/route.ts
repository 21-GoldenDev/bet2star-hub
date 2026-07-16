import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateBetReward } from "@/lib/helpers";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

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

/**
 * Calculate total betting amount and total reward for a sports_draw game
 * GET /api/admin/games/[id]/sports_draw/stats
 * Returns:
 * - totalBetAmount: sum of all staked amounts
 * - totalReward: sum of rewards for winning bets
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("type, prize_ids")
      .eq("id", gameId)
      .single();

    if (gameError || !game) throw gameError || new Error("Game not found");

    // Fetch all bets for this sports_draw game
    const { data: bets, error: betsError } = await supabase
      .from("bets_sports_draw")
      .select("*")
      .eq("game_id", gameId)
      .neq("status", "deleted");

    if (betsError) throw betsError;

    // Fetch all matches for this sports_draw game
    const { data: matches, error: matchesError } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", gameId);

    if (matchesError) throw matchesError;

    const drawOddsMap = extractSportsDrawOddsMap(game.prize_ids);
    const normalizedMatches = applySportsDrawOdds(matches || [], drawOddsMap);
    const maxWinAmount = await readMaxWinAmount(supabase);

    const totalBetAmount = (bets || []).reduce((sum, bet) => sum + (bet.staked || 0), 0);

    // Calculate total reward using helper
    const totalReward = (bets || []).reduce(
      (sum, bet) =>
        sum +
        (bet.award ||
          calculateBetReward(bet, normalizedMatches, true, maxWinAmount)),
      0
    );

    return NextResponse.json(
      { totalBetAmount, totalReward },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error calculating sports_draw stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
