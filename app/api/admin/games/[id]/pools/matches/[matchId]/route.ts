import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    await fetchPoolsGame(id);
    const body = await request.json();
    const { number, home, away, status } = body;

    const updateData: any = {};
    if (number !== undefined) updateData.number = number;
    if (home !== undefined) updateData.home = home;
    if (away !== undefined) updateData.away = away;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ match: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating pools match:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Game not found" ? 404 : message === "Matches can only be managed for pools games" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    await fetchPoolsGame(id);

    const { error } = await supabase.from("matches").delete().eq("id", matchId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Match deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting pools match:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Game not found" ? 404 : message === "Matches can only be managed for pools games" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
