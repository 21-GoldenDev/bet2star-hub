import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dedupePoolsMatchesByNumber } from "@/lib/pools/defaultMatches";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

async function fetchPoolsGame(gameId: string) {
  const { data, error } = await supabase
    .from("games")
    .select("type, week")
    .eq("id", gameId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Game not found");
  }

  if (data.type !== "pools") {
    throw new Error("Matches can only be managed for pools games");
  }

  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await fetchPoolsGame(id);

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("week", game.week)
      .order("number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { matches: dedupePoolsMatchesByNumber(data || []) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching pools matches:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Game not found" ? 404 : message === "Matches can only be managed for pools games" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await fetchPoolsGame(id);
    const body = await request.json();
    const { number, home, away, status } = body;

    if (number === undefined || !home || !away) {
      return NextResponse.json({ error: "Match number, home, and away are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("matches")
      .insert([
        {
          number,
          home,
          away,
          status: status || "enable",
          week: game.week,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating pools match:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Game not found" ? 404 : message === "Matches can only be managed for pools games" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
