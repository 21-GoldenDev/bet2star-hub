import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dedupePoolsMatchesByNumber } from "@/lib/pools/defaultMatches";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    const { data: activeGame } = await supabase
      .from("games")
      .select("week")
      .eq("type", "pools")
      .lte("start_time", now)
      .gte("end_time", now)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    let query = supabase
      .from("matches")
      .select("*")
      .eq("status", "enable");

    if (activeGame?.week !== undefined) {
      query = query.eq("week", activeGame.week);
    }

    const { data, error } = await query.order("number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { matches: dedupePoolsMatchesByNumber(data ?? []) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
