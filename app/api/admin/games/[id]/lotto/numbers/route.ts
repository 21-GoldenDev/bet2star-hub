import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

/**
 * GET /api/admin/games/[id]/lotto/numbers
 * Fetch visible numbers for a lotto game
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

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

/**
 * PUT /api/admin/games/[id]/lotto/numbers
 * Update visible numbers for a lotto game
 * Body: { visibleNumbers: number[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { visibleNumbers } = body;

    // Validate input
    if (!Array.isArray(visibleNumbers)) {
      return NextResponse.json(
        { error: "visibleNumbers must be an array" },
        { status: 400 }
      );
    }

    // Validate that all numbers are between 1-99
    if (!visibleNumbers.every(n => typeof n === "number" && n >= 1 && n <= 99)) {
      return NextResponse.json(
        { error: "All numbers must be between 1 and 99" },
        { status: 400 }
      );
    }

    // Update the game with visible numbers
    const { error: updateError } = await supabase
      .from("games")
      .update({ visible_numbers: visibleNumbers })
      .eq("id", gameId);

    if (updateError) {
      console.error("Error updating visible numbers:", updateError);
      return NextResponse.json(
        { error: "Failed to update visible numbers" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Visible numbers updated successfully",
        visibleNumbers
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating lotto numbers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
