import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getServiceClient();

  try {
    const now = new Date().toISOString();

    const { data: drawGame, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("type", "sports_draw")
      .lte("start_time", now)
      .gte("end_time", now)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }

    if (!drawGame) {
      return NextResponse.json({ game: null, matches: [] }, { status: 200 });
    }

    const { data: matches, error: matchesError } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", drawGame.id)
      .neq("status", "void")
      .order("number", { ascending: true });

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        game: drawGame,
        matches: matches ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching active sports draw game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
