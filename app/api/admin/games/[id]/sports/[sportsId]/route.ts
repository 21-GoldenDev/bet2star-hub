import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sportsId: string }> }
) {
  try {
    const { id, sportsId } = await params;
    const body = await request.json();
    const { league, number, home, away, home_goal, away_goal, prizes, status } = body ?? {};

    const updateData: Record<string, any> = {};
    if (league !== undefined) updateData.league = league;
    if (number !== undefined) updateData.number = number;
    if (home !== undefined) updateData.home = home;
    if (away !== undefined) updateData.away = away;
    if (home_goal !== undefined) updateData.home_goal = home_goal;
    if (away_goal !== undefined) updateData.away_goal = away_goal;
    if (prizes !== undefined) {
      updateData.prizes = Array.isArray(prizes) && prizes.length === 9
        ? prizes
        : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    if (status !== undefined) {
      updateData.status = status === "void" ? "void" : "active";
    }

    const { data, error } = await supabase
      .from("sports")
      .update(updateData)
      .eq("id", sportsId)
      .eq("game_id", id)
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
    console.error("Error updating sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sportsId: string }> }
) {
  try {
    const { id, sportsId } = await params;

    const { error } = await supabase
      .from("sports")
      .delete()
      .eq("id", sportsId)
      .eq("game_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Match deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
