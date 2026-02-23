import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Removed resolveSourceSportsGame function - sports_draw now manages its own matches

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
      return NextResponse.json({ game: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        game: drawGame,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching active sports draw game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
