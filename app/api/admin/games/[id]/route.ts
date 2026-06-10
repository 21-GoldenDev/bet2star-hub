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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { week, type, startTime, endTime, results, prize_ids, gameName } = body;

    const updateData: any = {};
    if (week !== undefined) updateData.week = week;
    if (type !== undefined) updateData.type = type;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (results !== undefined) updateData.results = results;
    if (prize_ids !== undefined) updateData.prize_ids = prize_ids;
    if (gameName !== undefined) {
      updateData.game_name =
        typeof gameName === "string" && gameName.trim() ? gameName.trim() : null;
    }

    const { data, error } = await supabase
      .from("games")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({ game: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    const deletePassword = process.env.ADMIN_GAME_DELETE_PASSWORD;

    if (!deletePassword) {
      return NextResponse.json(
        { error: "Password is not configured" },
        { status: 500 }
      );
    }

    if (typeof password !== "string" || password !== deletePassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, type")
      .eq("id", id)
      .single();

    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.type === "lotto") {
      const { error: betsLottoDeleteError } = await supabase
        .from("bets_lotto")
        .delete()
        .eq("game_id", id);

      if (betsLottoDeleteError) {
        return NextResponse.json({ error: betsLottoDeleteError.message }, { status: 500 });
      }
    }

    if (game.type === "pools") {
      const { error: betsPoolsDeleteError } = await supabase
        .from("bets_pools")
        .delete()
        .eq("game_id", id);

      if (betsPoolsDeleteError) {
        return NextResponse.json({ error: betsPoolsDeleteError.message }, { status: 500 });
      }
    }

    if (game.type === "sports") {
      const { error: betsSportDeleteError } = await supabase
        .from("bets_sport")
        .delete()
        .eq("game_id", id);

      if (betsSportDeleteError) {
        return NextResponse.json({ error: betsSportDeleteError.message }, { status: 500 });
      }

      const { error: sportsDeleteError } = await supabase
        .from("sports")
        .delete()
        .eq("game_id", id);

      if (sportsDeleteError) {
        return NextResponse.json({ error: sportsDeleteError.message }, { status: 500 });
      }
    }

    if (game.type === "sports_draw") {
      const { error: betsSportsDrawDeleteError } = await supabase
        .from("bets_sports_draw")
        .delete()
        .eq("game_id", id);

      if (betsSportsDrawDeleteError) {
        return NextResponse.json({ error: betsSportsDrawDeleteError.message }, { status: 500 });
      }

      const { error: sportsDeleteError } = await supabase
        .from("sports")
        .delete()
        .eq("game_id", id);

      if (sportsDeleteError) {
        return NextResponse.json({ error: sportsDeleteError.message }, { status: 500 });
      }
    }

    const { error } = await supabase.from("games").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Game deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
