import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Bet ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bets_lotto")
      .update({ status: "void", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Bet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bet voided successfully",
      data: data[0],
    });
  } catch (error) {
    console.error("Error voiding bet:", error);
    return NextResponse.json(
      { error: "Failed to void bet" },
      { status: 500 }
    );
  }
}
