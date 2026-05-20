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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;

    const { data: game, error } = await supabase
      .from("games")
      .select("void_window_minutes")
      .eq("id", gameId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(
      { voidWindowMinutes: game.void_window_minutes ?? null },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching void window:", error);
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
    const { voidWindowMinutes } = body;

    if (
      voidWindowMinutes !== null &&
      (typeof voidWindowMinutes !== "number" || !Number.isFinite(voidWindowMinutes) || voidWindowMinutes < 0)
    ) {
      return NextResponse.json(
        { error: "voidWindowMinutes must be a non-negative number or null" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .update({
        void_window_minutes: voidWindowMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select("void_window_minutes")
      .single();

    if (error) {
      console.error("Error updating void window:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, voidWindowMinutes: data.void_window_minutes ?? null },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating void window:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
