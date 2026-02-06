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
      .from("games")
      .select("prize_ids")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: prizesData, error: prizesError } = await supabase
      .from("prize")
      .select("id, name, commission");

    if (prizesError) {
      return NextResponse.json({ error: prizesError.message }, { status: 500 });
    }

    const prizesMap = new Map(
      prizesData?.map((prize) => [prize.id, prize]) || []
    );

    const prizeIds = data?.prize_ids || [];
    const enrichedPrizes = prizeIds.map((prizeEntry: any) => {
      const prizeId = typeof prizeEntry === "string" ? prizeEntry : prizeEntry.id;
      const prizeDetails = prizesMap.get(prizeId);
      return {
        id: prizeId,
        name: prizeDetails?.name || "Unknown Prize",
      };
    });

    return NextResponse.json({ game_prizes: enrichedPrizes }, { status: 200 });
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
    const { prize_id, status } = body;

    // Validate required fields
    if (!prize_id) {
      return NextResponse.json(
        { error: "Missing required fields (prize_id)" },
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

    const prizeExists = currentPrizes.some((p: any) => 
      (typeof p === "string" ? p : p.id) === prize_id
    );

    if (prizeExists) {
      return NextResponse.json(
        { error: "Prize already associated with this game" },
        { status: 400 }
      );
    }

    const newPrize = {
      id: prize_id,
      status: status ?? "active",
    };

    const updatedPrizes = [...currentPrizes, newPrize];

    const { error } = await supabase
      .from("games")
      .update({ prize_ids: updatedPrizes })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ game_prize: newPrize }, { status: 201 });
  } catch (error) {
    console.error("Error creating game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
