import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Bet ID is required" }, { status: 400 });
    }

    const { data: bet, error: fetchError } = await supabase
      .from("bets_lotto")
      .select("staked")
      .eq("id", id)
      .single();

    if (fetchError || !bet) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("bets_lotto")
      .update({
        status: "deleted",
        award: bet.staked,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
