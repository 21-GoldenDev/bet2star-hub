import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

const SPORTS_KEYS = ["1", "X", "2", "1X", "12", "X2", "OV 2.5", "UN 2.5", "GG"] as const;
const SPORTS_DRAW_KEYS = ["X"] as const;

const SPORTS_DEFAULT_MAX_PRIZE: Record<string, number> = {
  "1": 2,
  X: 1.6,
  "2": 1.9,
  "1X": 1.1,
  "12": 2.1,
  X2: 3.2,
  "OV 2.5": 3,
  "UN 2.5": 3.5,
  GG: 3.1,
};

const SPORTS_DRAW_DEFAULT_MAX_PRIZE: Record<string, number> = {
  X: 1.6,
};

function sanitizeMaxPrize(input: any, allowedKeys: readonly string[], defaults: Record<string, number>) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? input
    : defaults;

  return allowedKeys.reduce((acc, key) => {
    const value = Number(source[key]);
    acc[key] = Number.isFinite(value) && value > 0 ? value : defaults[key];
    return acc;
  }, {} as Record<string, number>);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    const { data: game, error } = await supabase
      .from("games")
      .select("type, max_prize")
      .eq("id", gameId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.type !== "sports" && game.type !== "sports_draw") {
      return NextResponse.json({ error: "Max prize settings are only available for sports games" }, { status: 400 });
    }

    const maxPrize = game.type === "sports"
      ? sanitizeMaxPrize(game.max_prize, SPORTS_KEYS, SPORTS_DEFAULT_MAX_PRIZE)
      : sanitizeMaxPrize(game.max_prize, SPORTS_DRAW_KEYS, SPORTS_DRAW_DEFAULT_MAX_PRIZE);

    return NextResponse.json({ maxPrize }, { status: 200 });
  } catch (error) {
    console.error("Error fetching max prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();

    const { game_type, max_prize } = body;

    if (!game_type || !max_prize) {
      return NextResponse.json(
        { error: "game_type and max_prize are required" },
        { status: 400 }
      );
    }

    if (game_type !== "sports" && game_type !== "sports_draw") {
      return NextResponse.json(
        { error: "Only sports and sports_draw are supported" },
        { status: 400 }
      );
    }

    const allowedKeys = game_type === "sports" ? SPORTS_KEYS : SPORTS_DRAW_KEYS;
    const defaults = game_type === "sports" ? SPORTS_DEFAULT_MAX_PRIZE : SPORTS_DRAW_DEFAULT_MAX_PRIZE;
    const maxPrizeData = sanitizeMaxPrize(max_prize, allowedKeys, defaults);

    const { error: updateError } = await supabase
      .from("games")
      .update({
        max_prize: maxPrizeData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .eq("type", game_type);

    if (updateError) {
      console.error("Error updating max prize:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, maxPrize: maxPrizeData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating max prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
