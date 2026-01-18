import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

/**
 * Calculate total betting amount and total reward for a lotto game
 * GET /api/admin/games/[id]/lotto/stats
 * Returns:
 * - totalBetAmount: sum of all staked amounts
 * - totalReward: sum of awards (persisted in database)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    // Fetch all bets for this game
    const { data: bets, error: betsError } = await supabase
      .from("bets_lotto")
      .select("*")
      .eq("game_id", gameId);

    if (betsError) throw betsError;

    const totalBetAmount = (bets || []).reduce((sum, bet) => sum + (bet.staked || 0), 0);
    const totalReward = (bets || []).reduce((sum, bet) => sum + (bet.award || 0), 0);

    return NextResponse.json(
      { totalBetAmount, totalReward },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error calculating lotto stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
