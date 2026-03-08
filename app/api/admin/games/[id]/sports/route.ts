import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

// Removed the resolveSportsMatchGameId function - now sports_draw games manage their own matches

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Directly fetch matches for this game_id (works for both sports and sports_draw)
    const { data, error } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", id)
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

    // Now sports_draw games can manage their own matches
    if (game.type !== "sports" && game.type !== "sports_draw") {
      return NextResponse.json(
        { error: "This game type does not support match management" },
        { status: 400 }
      );
    }

    const { league_id, number, home, away, prizes, status, start_time, end_time } = body ?? {};

    if (!league_id || number === undefined || !home || !away) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: leagueData, error: leagueError } = await supabase
      .from("sports_leagues")
      .select("id, name")
      .eq("id", league_id)
      .single();

    if (leagueError || !leagueData) {
      return NextResponse.json({ error: "Invalid league selected" }, { status: 400 });
    }

    const prizesArray = Array.isArray(prizes) && prizes.length > 0
      ? prizes
      : [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const { data, error } = await supabase
      .from("sports")
      .insert([
        {
          game_id: id,
          league: leagueData.name,
          league_id: leagueData.id,
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
