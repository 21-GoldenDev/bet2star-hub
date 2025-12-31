import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("games")
      .select("id, week, results")
      .eq("type", "lotto")
      .order("week", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching weeks:", error);
    return NextResponse.json(
      { error: "Failed to fetch weeks" },
      { status: 500 }
    );
  }
}
