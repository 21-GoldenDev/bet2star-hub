import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await request.json();
    const gameId = body?.game_id;
    const result = body?.result;

    if (!gameId || result === undefined || result === null || result === "") {
      return NextResponse.json({ error: "game_id and result are required" }, { status: 400 });
    }

    if (!Array.isArray(result)) {
      return NextResponse.json({ error: "result must be an array of numbers" }, { status: 400 });
    }

    const validResult = result.filter((num) => typeof num === "number" && !isNaN(num));

    const { error: updateError } = await supabase
      .from("games")
      .update({ results: validResult })
      .eq("id", gameId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error setting lotto result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
