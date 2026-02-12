import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

interface TerminalCommission {
  terminal: string;
  commission: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServer();
    const gameId = (await params).id;

    const { data: game, error } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", gameId)
      .single();

    if (error) throw error;

    const commissions = game?.prize_ids?.commissions || [];

    return NextResponse.json({ commissions });
  } catch (error) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServer();
    const gameId = (await params).id;
    const { commissions } = await request.json();

    if (!Array.isArray(commissions)) {
      return NextResponse.json(
        { error: "Invalid commissions format" },
        { status: 400 }
      );
    }

    for (const comm of commissions) {
      if (
        typeof comm.terminal !== "string" ||
        typeof comm.commission !== "number" ||
        comm.commission < 0 ||
        comm.commission > 100
      ) {
        return NextResponse.json(
          { error: "Invalid commission data" },
          { status: 400 }
        );
      }
    }

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", gameId)
      .single();

    if (fetchError) throw fetchError;

    const updatedPrizeIds = {
      ...(game?.prize_ids || {}),
      commissions,
    };

    const { error: updateError } = await supabase
      .from("games")
      .update({ prize_ids: updatedPrizeIds })
      .eq("id", gameId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Commissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating commissions:", error);
    return NextResponse.json(
      { error: "Failed to update commissions" },
      { status: 500 }
    );
  }
}
