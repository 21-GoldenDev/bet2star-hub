import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateBetReward } from "@/lib/helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

/**
 * Calculate total betting amount and total reward for a sports game
 * GET /api/admin/games/[id]/sports/stats
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

    // Fetch all bets for this game
    const { data: bets, error: betsError } = await supabase
      .from("bets_sport")
      .select("*")
      .eq("game_id", gameId)
      .neq("status", "deleted");

    if (betsError) throw betsError;

    // Fetch all matches for this game
    const { data: matches, error: matchesError } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", gameId);

    if (matchesError) throw matchesError;

    const totalBetAmount = (bets || []).reduce((sum, bet) => sum + (bet.staked || 0), 0);

    // Calculate total reward using helper
    const totalReward = (bets || []).reduce(
      (sum, bet) => sum + calculateBetReward(bet, matches || []),
      0
    );

    return NextResponse.json(
      { totalBetAmount, totalReward },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error calculating sports stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
