import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  defaultCommissionForPrize,
  syncTerminalsIfPoolsGame,
} from "@/lib/admin/gamePrizeMutations";
import { normalizeGamePrizeEntries, validateCommission } from "@/lib/admin/syncTerminalPrizesFromGame";

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
    const normalized = normalizeGamePrizeEntries(prizeIds);
    const enrichedPrizes = normalized.map((prizeEntry) => {
      const prizeDetails = prizesMap.get(prizeEntry.id);
      return {
        id: prizeEntry.id,
        name: prizeDetails?.name || "Unknown Prize",
        status: prizeEntry.status,
        commission: prizeEntry.commission ?? prizeDetails?.commission ?? 100,
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
    const { prize_id, status, commission: commissionInput } = body;

    // Validate required fields
    if (!prize_id) {
      return NextResponse.json(
        { error: "Missing required fields (prize_id)" },
        { status: 400 }
      );
    }

    if (commissionInput !== undefined && !validateCommission(commissionInput)) {
      return NextResponse.json(
        { error: "Invalid commission. Must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("type, prize_ids")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentPrizes = normalizeGamePrizeEntries(game?.prize_ids);

    const prizeExists = currentPrizes.some((p: any) => 
      (typeof p === "string" ? p : p.id) === prize_id
    );

    if (prizeExists) {
      return NextResponse.json(
        { error: "Prize already associated with this game" },
        { status: 400 }
      );
    }

    const commission = await defaultCommissionForPrize(
      supabase,
      prize_id,
      commissionInput
    );

    const newPrize = {
      id: prize_id,
      status: status ?? "active",
      commission,
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

    const syncError = await syncTerminalsIfPoolsGame(
      supabase,
      game?.type ?? "",
      updatedPrizes
    );
    if (syncError.error) {
      return NextResponse.json({ error: syncError.error }, { status: 500 });
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
