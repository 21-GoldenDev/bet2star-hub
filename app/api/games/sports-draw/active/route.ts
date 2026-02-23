import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function resolveSourceSportsGame(supabase: any, drawGame: any) {
  if (!drawGame) return null;

  if (Number.isFinite(drawGame.week)) {
    const { data: weekSports, error: weekError } = await supabase
      .from("games")
      .select("*")
      .eq("type", "sports")
      .eq("week", drawGame.week)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!weekError && weekSports) return weekSports;
  }

  if (drawGame.start_time && drawGame.end_time) {
    const { data: overlapSports, error: overlapError } = await supabase
      .from("games")
      .select("*")
      .eq("type", "sports")
      .lte("start_time", drawGame.end_time)
      .gte("end_time", drawGame.start_time)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!overlapError && overlapSports) return overlapSports;
  }

  return null;
}

export async function GET() {
  const supabase = await createSupabaseServer();

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
      return NextResponse.json({ game: null, sourceSportsGame: null }, { status: 200 });
    }

    const sourceSportsGame = await resolveSourceSportsGame(supabase, drawGame);

    return NextResponse.json(
      {
        game: {
          ...drawGame,
          source_sports_game_id: sourceSportsGame?.id ?? null,
        },
        sourceSportsGame,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching active sports draw game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
