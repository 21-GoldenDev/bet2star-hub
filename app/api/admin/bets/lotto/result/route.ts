import { createSupabaseServer } from "@/lib/supabase/server";
import {
  TurboPrize,
  computeLottoAward,
} from "@/lib/helpers";
import { NextRequest, NextResponse } from "next/server";
import { Prize } from "@/lib/types/prize";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await request.json();
    const gameId = body?.game_id;
    const result = body?.result;

    if (!gameId || result === undefined || result === null || result === "") {
      return NextResponse.json({ error: "game_id and result are required" }, { status: 400 });
    }

    if (!Array.isArray(result)) {
      return NextResponse.json({ error: "result must be an array of numbers" }, { status: 400 });
    }

    const validResult = result.filter((num) => typeof num === "number" && !isNaN(num));

    const { error: updateError } = await supabase
      .from("games")
      .update({ results: validResult })
      .eq("id", gameId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Recalculate awards for bets in this game based on the new result
    const { data: bets, error: betsError } = await supabase
      .from("bets_lotto")
      .select("id, gameType, staked, under, numbers, prize_id, player, status")
      .eq("game_id", gameId);

    if (betsError) {
      console.error("Error fetching bets for award recompute:", betsError);
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const uniquePrizeIds = Array.from(new Set((bets || []).map((b: any) => b.prize_id).filter((id): id is string => !!id)));

    let prizeMap: Record<string, Prize> = {};
    if (uniquePrizeIds.length > 0) {
      const { data: prizesData, error: prizesError } = await supabase
        .from("prize")
        .select("id, name, data")
        .in("id", uniquePrizeIds);

      if (prizesError) {
        console.error("Error fetching prize data:", prizesError);
      }

      prizeMap = (prizesData || []).reduce((acc: Record<string, Prize>, prize: Prize) => {
        acc[prize.id] = prize;
        return acc;
      }, {});
    }

    const { data: turboPrizeData, error: turboPrizeError } = await supabase
      .from("turbo_prize")
      .select("*")
      .single();

    if (turboPrizeError) {
      console.error("Error fetching turbo prize data:", turboPrizeError);
    }

    const updates = (bets || []).map((bet: any) => {
      const prize = bet.prize_id ? prizeMap[bet.prize_id] ?? null : null;
      const award = computeLottoAward(bet, prize, validResult, turboPrizeData as TurboPrize | null);
      return { id: bet.id, award };
    });

    const nonNullUpdates = updates.filter((u) => Number.isFinite(u.award));
    if (nonNullUpdates.length > 0) {
      const updateChunks = chunkArray(nonNullUpdates, 50);
      for (const chunk of updateChunks) {
        const promises = chunk.map((u) =>
          supabase
            .from("bets_lotto")
            .update({ award: u.award })
            .eq("id", u.id)
        );
        const results = await Promise.all(promises);
        const failed = results.find((r) => (r as any).error);
        if (failed && (failed as any).error) {
          console.error("Error updating awards:", (failed as any).error);
          return NextResponse.json({ error: (failed as any).error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error setting lotto result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
