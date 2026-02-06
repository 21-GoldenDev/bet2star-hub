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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  try {
    const { id, prizeId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Missing required fields (status)" },
        { status: 400 }
      );
    }
    if (status !== "active" && status !== "inactive") {
      return NextResponse.json(
        { error: "Invalid status value (must be 'active' or 'inactive')" },
        { status: 400 }
      );
    }

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentPrizes = game?.prize_ids || [];
    const prizeIndex = currentPrizes.findIndex((p: any) => 
      (typeof p === "string" ? p : p.id) === prizeId
    );

    if (prizeIndex === -1) {
      return NextResponse.json(
        { error: "Prize not found in game" },
        { status: 404 }
      );
    }

    const updatedPrizes = [...currentPrizes];
    updatedPrizes[prizeIndex] = {
      ...updatedPrizes[prizeIndex],
      status,
    };

    const { error: updateError } = await supabase
      .from("games")
      .update({ prize_ids: updatedPrizes })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ game_prize: updatedPrizes[prizeIndex] }, { status: 200 });
  } catch (error) {
    console.error("Error updating game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  try {
    const { id, prizeId } = await params;

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentPrizes = game?.prize_ids || [];
    const filteredPrizes = currentPrizes.filter((p: any) => 
      (typeof p === "string" ? p : p.id) !== prizeId
    );

    if (filteredPrizes.length === currentPrizes.length) {
      return NextResponse.json(
        { error: "Prize not found in game" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("games")
      .update({ prize_ids: filteredPrizes })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Game prize deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

