import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

/**
 * GET /api/games/[gameId]/lotto/numbers
 * Fetch visible numbers for a lotto game
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Fetch the game to get visible_numbers
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("visible_numbers")
      .eq("id", gameId)
      .single();

    if (gameError) {
      console.error("Error fetching game:", gameError);
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // If visible_numbers is null or not set, return all numbers (1-99)
    const visibleNumbers = game?.visible_numbers || Array.from({ length: 99 }, (_, i) => i + 1);

    return NextResponse.json(
      { visibleNumbers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching lotto numbers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
