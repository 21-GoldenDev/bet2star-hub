import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { selectedUs, groupSelections, betAmount, totalUnder } = await request.json();

    if (!selectedUs || selectedUs.length < 2) {
      return NextResponse.json({ error: "At least 2 groups required" }, { status: 400 });
    }

    if (!groupSelections || Object.keys(groupSelections).length === 0) {
      return NextResponse.json({ error: "No numbers selected" }, { status: 400 });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    // Transform selectedUs to database format
    const numbersObj: Record<string, number[]> = {};
    selectedUs.forEach((sel: { id: string; u: number }) => {
      const nums = groupSelections[sel.id] || [];
      numbersObj[`${sel.u}-${sel.id}`] = nums;
    });

    const { data, error } = await supabase
      .from("bets_lotto")
      .insert({
        game_id: crypto.randomUUID(),
        gameType: "grouping",
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
