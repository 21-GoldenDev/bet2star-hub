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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("game_prizes")
      .select("*")
      .eq("game_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game_prizes: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching game prizes:", error);
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
    const { id } = await params;
    const body = await request.json();
    const { prize_id, commission, status } = body;

    // Validate required fields
    if (!prize_id) {
      return NextResponse.json(
        { error: "Missing required fields (prize_id)" },
        { status: 400 }
      );
    }

    // Validate commission
    const finalCommission = commission ?? 100;
    if (finalCommission < 0 || finalCommission > 100) {
      return NextResponse.json(
        { error: "Commission must be between 0 and 100" },
        { status: 400 }
      );
    }

    const finalStatus = status ?? "active";

    const { data, error } = await supabase
      .from("game_prizes")
      .insert([
        {
          game_id: id,
          prize_id,
          commission: finalCommission,
          status: finalStatus,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game_prize: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
