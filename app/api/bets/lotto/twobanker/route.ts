import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function fetchCurrentLottoGameId(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("games")
    .select("id, start_time, end_time")
    .eq("type", "lotto")
    .lte("start_time", now)
    .gte("end_time", now)
    .order("start_time", { ascending: false })
    .limit(1);

  if (error) throw error;

  const game = data?.[0];
  if (!game) {
    throw new Error("No lotto game configured");
  }

  return game.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const gameId = await fetchCurrentLottoGameId(supabase);

    const { totalUnder, groupAU, groupANumbers, betAmount, prize } = await request.json();

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

    if (!prize) {
      return NextResponse.json({ error: "Invalid prize selection" }, { status: 400 });
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
        game_id: gameId,
        gameType: "two_banker",
        player: user?.id,
        under: [totalUnder],
        numbers: numbersObj,
        staked: betAmount,
        terminal: "",
        prize_id: prize,
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
  } catch (error: any) {
    console.error("API error:", error);
    const message = error?.message || "Internal server error";
    const status = message === "No lotto game configured" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
