import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getServiceClient();
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("type", "sports")
      .lte("start_time", now)
      .gte("end_time", now)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ game: null, matches: [] }, { status: 200 });
    }

    let matches: any[] = [];
    const joined = await supabase
      .from("sports")
      .select("*, sports_leagues(name, sports_countries(name))")
      .eq("game_id", data.id)
      .neq("status", "void")
      .order("number", { ascending: true });

    if (joined.error) {
      const fallback = await supabase
        .from("sports")
        .select("*")
        .eq("game_id", data.id)
        .neq("status", "void")
        .order("number", { ascending: true });
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      matches = fallback.data ?? [];
    } else {
      matches = joined.data ?? [];
    }

    return NextResponse.json({ game: { ...data }, matches }, { status: 200 });
  } catch (error) {
    console.error("Error fetching active sports game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
