import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { computeLottoAward, TurboPrize } from "@/lib/helpers";
import { Prize } from "@/lib/types/prize";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServer();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Bet ID is required" }, { status: 400 });
    }

    const { data: bet, error: fetchError } = await supabase
      .from("bets_lotto")
      .select("id, game_id, gameType, staked, under, numbers, prize_id, player, status")
      .eq("id", id)
      .single();

    if (fetchError || !bet) {
      console.error("Supabase fetch error:", fetchError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("results")
      .eq("id", bet.game_id)
      .single();

    if (gameError || !game) {
      console.error("Game fetch error:", gameError);
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const weekResult = game.results || [];

    let prize: Prize | null = null;
    if (bet.prize_id) {
      const { data: prizeData, error: prizeError } = await supabase
        .from("prize")
        .select("id, name, data")
        .eq("id", bet.prize_id)
        .single();

      if (!prizeError && prizeData) {
        prize = prizeData;
      }
    }

    const { data: turboPrizeData } = await supabase
      .from("turbo_prize")
      .select("*")
      .single();

    const award = computeLottoAward({ ...bet, status: "active" }, prize, weekResult, turboPrizeData as TurboPrize | null);

    const { error } = await supabase
      .from("bets_lotto")
      .update({
        status: "active",
        award: award,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
