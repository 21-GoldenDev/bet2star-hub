import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncTerminalsIfPoolsGame } from "@/lib/admin/gamePrizeMutations";
import { recomputePoolsAwardsForGame } from "@/lib/admin/recomputePoolsAwards";
import {
  normalizeGamePrizeEntries,
  validateCommission,
  normalizeException,
} from "@/lib/admin/syncTerminalPrizesFromGame";

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
    const { status, commission, exception } = body;

    if (status === undefined && commission === undefined && exception === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (status, commission, or exception)" },
        { status: 400 }
      );
    }
    if (status !== undefined && status !== "active" && status !== "inactive") {
      return NextResponse.json(
        { error: "Invalid status value (must be 'active' or 'inactive')" },
        { status: 400 }
      );
    }
    if (commission !== undefined && !validateCommission(commission)) {
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

    if (exception !== undefined && game?.type !== "pools") {
      return NextResponse.json(
        { error: "Exception is only supported for pools games" },
        { status: 400 }
      );
    }

    const currentPrizes = normalizeGamePrizeEntries(game?.prize_ids);
    const prizeIndex = currentPrizes.findIndex((p) => p.id === prizeId);

    if (prizeIndex === -1) {
      return NextResponse.json(
        { error: "Prize not found in game" },
        { status: 404 }
      );
    }

    const updatedPrizes = [...currentPrizes];
    const nextEntry = {
      ...updatedPrizes[prizeIndex],
      ...(status !== undefined ? { status } : {}),
      ...(commission !== undefined ? { commission } : {}),
    };
    if (exception !== undefined) {
      const normalized = normalizeException(exception);
      if (normalized) {
        nextEntry.exception = normalized;
      } else {
        delete nextEntry.exception;
      }
    }
    updatedPrizes[prizeIndex] = nextEntry;

    const { error: updateError } = await supabase
      .from("games")
      .update({ prize_ids: updatedPrizes })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const syncError = await syncTerminalsIfPoolsGame(
      supabase,
      game?.type ?? "",
      updatedPrizes
    );
    if (syncError.error) {
      return NextResponse.json({ error: syncError.error }, { status: 500 });
    }

    if (exception !== undefined && game?.type === "pools") {
      const recompute = await recomputePoolsAwardsForGame(supabase, id);
      if (recompute.error) {
        return NextResponse.json({ error: recompute.error }, { status: 500 });
      }
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
    const { password } = await request.json();

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("type, prize_ids")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (game?.type === "pools") {
      const deletePassword = process.env.ADMIN_GAME_DELETE_PASSWORD;

      if (!deletePassword) {
        return NextResponse.json(
          { error: "Password is not configured" },
          { status: 500 }
        );
      }

      if (typeof password !== "string" || password !== deletePassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    const currentPrizes = normalizeGamePrizeEntries(game?.prize_ids);
    const filteredPrizes = currentPrizes.filter((p) => p.id !== prizeId);

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

    const syncError = await syncTerminalsIfPoolsGame(
      supabase,
      game?.type ?? "",
      filteredPrizes
    );
    if (syncError.error) {
      return NextResponse.json({ error: syncError.error }, { status: 500 });
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

