import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("games")
      .select("id, week")
      .eq("type", "sports")
      .order("week", { ascending: false });

    if (error) throw error;

    const weeks = Array.from(new Set(data?.map((g) => g.week) || [])).sort(
      (a, b) => b - a
    );

    return NextResponse.json({ data, latest: weeks[0] || null });
  } catch (error) {
    console.error("Error fetching weeks:", error);
    return NextResponse.json(
      { error: "Failed to fetch weeks" },
      { status: 500 }
    );
  }
}
