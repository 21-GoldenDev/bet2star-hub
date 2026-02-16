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
    const { id: gameId } = await params;

    const { data: game, error } = await supabase
      .from("games")
      .select("type, max_stake")
      .eq("id", gameId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const maxStakes = [];

    if (game.max_stake) {
      if (game.type === "pools" || game.type === "sports") {
        // For pools/sports: { "1": 10000, "2": 50000, "3": 100000, "4": 150000 }
        if (game.max_stake["1"]) {
          maxStakes.push({ match_at_least: 1, max_amount: game.max_stake["1"] });
        }
        if (game.max_stake["2"]) {
          maxStakes.push({ match_at_least: 2, max_amount: game.max_stake["2"] });
        }
        if (game.max_stake["3"]) {
          maxStakes.push({ match_at_least: 3, max_amount: game.max_stake["3"] });
        }
        if (game.max_stake["4"]) {
          maxStakes.push({ match_at_least: 4, max_amount: game.max_stake["4"] });
        }
      } else {
        // For lotto: { "amount": 100000 } or just a number
        const amount = typeof game.max_stake === "number"
          ? game.max_stake
          : game.max_stake.amount;
        if (amount) {
          maxStakes.push({ max_amount: amount });
        }
      }
    }

    return NextResponse.json({ maxStakes }, { status: 200 });
  } catch (error) {
    console.error("Error fetching max stakes:", error);
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

    const { game_type, max_stakes } = body;

    if (!game_type || !max_stakes) {
      return NextResponse.json(
        { error: "game_type and max_stakes are required" },
        { status: 400 }
      );
    }

    let maxStakeData: any;

    if (game_type === "pools" || game_type === "sports") {
      // For pools/sports: store as { "1": 10000, "2": 50000, "3": 100000, "4": 150000 }
      maxStakeData = {};
      max_stakes.forEach((stake: any) => {
        if (stake.match_at_least) {
          maxStakeData[stake.match_at_least.toString()] = stake.max_amount;
        }
      });
    } else {
      // For lotto: store as { "amount": 100000 }
      maxStakeData = { amount: max_stakes[0]?.max_amount || 0 };
    }

    const { error: updateError } = await supabase
      .from("games")
      .update({
        max_stake: maxStakeData,
        updated_at: new Date().toISOString()
      })
      .eq("id", gameId);

    if (updateError) {
      console.error("Error updating max stakes:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, maxStake: maxStakeData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating max stakes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
