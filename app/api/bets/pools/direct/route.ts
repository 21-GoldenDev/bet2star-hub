import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function fetchCurrentPoolsGameId(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("games")
    .select("id, start_time, end_time")
    .eq("type", "pools")
    .lte("start_time", now)
    .gte("end_time", now)
    .order("start_time", { ascending: false })
    .limit(1);

  if (error) throw error;

  const game = data?.[0];
  if (!game) {
    throw new Error("No pools game configured");
  }

  return game.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const gameId = await fetchCurrentPoolsGameId(supabase);

    const { selectedMatches, betAmount, matchAtLeast, prize } = await request.json();

    if (!selectedMatches || selectedMatches.length === 0) {
      return NextResponse.json({ error: "Invalid matches" }, { status: 400 });
    }

    if (!matchAtLeast || matchAtLeast.length === 0) {
      return NextResponse.json({ error: "Invalid under values" }, { status: 400 });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }

    if (!prize) {
      return NextResponse.json({ error: "Invalid prize selection" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bets_pools")
      .insert({
        game_id: gameId,
        gameType: "nap_perm",
        player: user?.id,
        under: matchAtLeast,
        matches: selectedMatches,
        staked: betAmount,
        terminal: "",
        bet_time: new Date().toISOString(),
        prize_id: prize,
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
    const status = message === "No pools game configured" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
