import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("*, game_prizes(prize_id, prize(name, data))")
      .eq("type", "lotto")
      .lte("start_time", now)
      .gte("end_time", now)
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ game: null }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const prizes = data.game_prizes?.map((gp: any) => ({
      id: gp.prize_id,
      name: gp.prize?.name || "Unknown Prize",
      data: gp.prize?.data || {},
    })) || [];

    return NextResponse.json({ game: { ...data, prizes } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching active lotto game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
