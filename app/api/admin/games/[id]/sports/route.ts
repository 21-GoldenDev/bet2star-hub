import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("sports")
      .select("*")
      .eq("game_id", id)
      .order("number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ matches: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sports matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { league, number, home, away, prizes, status } = body ?? {};

    if (!league || number === undefined || !home || !away) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prizesArray = Array.isArray(prizes) && prizes.length === 9
      ? prizes
      : [0, 0, 0, 0, 0, 0, 0, 0, 0];

    const { data, error } = await supabase
      .from("sports")
      .insert([
        {
          game_id: id,
          league,
          number,
          home,
          away,
          prizes: prizesArray,
          status: status === "void" ? "void" : "active",
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ match: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
