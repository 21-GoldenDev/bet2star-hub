import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: gamesWithPrizes, error: prizesError } = await supabase
      .from("game_prizes")
      .select("game_id, prize_id, prize(name)");
    if (prizesError) {
      return NextResponse.json({ error: prizesError.message }, { status: 500 });
    }
    
    const prizesMap: Record<string, Array<{ id: string; name: string }>> = {};
    gamesWithPrizes?.forEach((gp: any) => {
      if (!prizesMap[gp.game_id]) {
        prizesMap[gp.game_id] = [];
      }
      prizesMap[gp.game_id].push({
        id: gp.prize_id,
        name: gp.prize?.name || "Unknown Prize",
      });
    });

    const games = data.map((game) => ({
      ...game,
      prizes: prizesMap[game.id] || [],
    }));

    return NextResponse.json({ games }, { status: 200 });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { week, type, startTime, endTime, results } = body;

    // Validate required fields
    if (!week || !type || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          week,
          type,
          start_time: startTime,
          end_time: endTime,
          results: results || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
