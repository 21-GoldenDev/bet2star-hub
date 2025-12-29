import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { selectedNumbers, betAmount, matchAtLeast } = await request.json();

    if (!selectedNumbers || selectedNumbers.length === 0) {
      return NextResponse.json({ error: "Invalid numbers" }, { status: 400 });
    }

    if (!matchAtLeast || matchAtLeast.length === 0) {
      return NextResponse.json({ error: "Invalid under values" }, { status: 400 });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bets_lotto")
      .insert({
        game_id: crypto.randomUUID(),
        gameType: "nap_perm",
        week: Math.ceil(new Date().getDate() / 7), // Simple week calculation
        player: user?.id,
        under: matchAtLeast,
        numbers: selectedNumbers,
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
