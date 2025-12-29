import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { selectedMatches, betAmount, matchAtLeast } = await request.json();

    if (!selectedMatches || selectedMatches.length === 0) {
      return NextResponse.json({ error: "Invalid matches" }, { status: 400 });
    }

    if (!matchAtLeast || matchAtLeast.length === 0) {
      return NextResponse.json({ error: "Invalid under values" }, { status: 400 });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bets_pools")
      .insert({
        game_id: crypto.randomUUID(),
        gameType: "nap_perm",
        week: Math.ceil(new Date().getDate() / 7), // Simple week calculation
        player: user?.id,
        under: matchAtLeast,
        matches: selectedMatches,
        staked: betAmount,
        terminal: "",
        bet_time: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Bet placed successfully", data: data[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
