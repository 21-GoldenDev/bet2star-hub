import { createSupabaseServer } from "@/lib/supabase/server";
import { isPoolsLikeGameType } from "@/lib/pools/gameType";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const requestedType = request.nextUrl.searchParams.get("type");
    const gameType = isPoolsLikeGameType(requestedType) ? requestedType : "pools";

    const { data, error } = await supabase
      .from("games")
      .select("id, week, results, game_name, type")
      .eq("type", gameType)
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
