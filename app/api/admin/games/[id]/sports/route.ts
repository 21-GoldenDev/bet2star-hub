import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

async function resolveSportsMatchGameId(targetGameId: string): Promise<string | null> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, type, week, start_time, end_time")
    .eq("id", targetGameId)
    .single();

  if (gameError || !game) return null;
  if (game.type === "sports") return game.id;
  if (game.type !== "sports_draw") return game.id;

  if (Number.isFinite(game.week)) {
    const { data: weekSports, error: weekError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports")
      .eq("week", game.week)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!weekError && weekSports?.id) return weekSports.id;
  }

  if (game.start_time && game.end_time) {
    const { data: overlapSports, error: overlapError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports")
      .lte("start_time", game.end_time)
      .gte("end_time", game.start_time)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!overlapError && overlapSports?.id) return overlapSports.id;
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchGameId = await resolveSportsMatchGameId(id);

    if (!matchGameId) {
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", matchGameId)
      .order("number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ matches: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sports matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("type")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.type === "sports_draw") {
      return NextResponse.json(
        { error: "Sports Draw matches are imported from Sports and cannot be managed here" },
        { status: 400 }
      );
    }

    const { league, number, home, away, prizes, status, start_time, end_time } = body ?? {};

    if (!league || number === undefined || !home || !away) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prizesArray = Array.isArray(prizes) && prizes.length === 9
      ? prizes
      : [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const { data, error } = await supabase
      .from("sports")
      .insert([
        {
          game_id: id,
          league,
          number,
          home,
          away,
          prizes: prizesArray,
          status: status === "void" ? "void" : "active",
          start_time,
          end_time,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
