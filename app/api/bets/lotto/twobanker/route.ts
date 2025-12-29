import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { totalUnder, groupAU, groupANumbers, betAmount } = await request.json();

    if (!totalUnder || totalUnder < 3) {
      return NextResponse.json({ error: "Invalid total under" }, { status: 400 });
    }

    if (!groupAU || groupAU < 1) {
      return NextResponse.json({ error: "Invalid group A under" }, { status: 400 });
    }

    if (!groupANumbers || groupANumbers.length !== 2) {
      return NextResponse.json({ error: "Group A must have exactly 2 numbers" }, { status: 400 });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    const groupBU = totalUnder - groupAU;
    const allNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
    const groupBNumbers = allNumbers.filter((n) => !groupANumbers.includes(n));

    const numbersObj = {
      [`${groupAU}-groupA`]: groupANumbers,
      [`${groupBU}-groupB`]: groupBNumbers,
    };

    const { data, error } = await supabase
      .from("bets_lotto")
      .insert({
        game_id: crypto.randomUUID(),
        gameType: "two_banker",
        week: Math.ceil(new Date().getDate() / 7),
        player: user?.id,
        under: [totalUnder],
        numbers: numbersObj,
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
