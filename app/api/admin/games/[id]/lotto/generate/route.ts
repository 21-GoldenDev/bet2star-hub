import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { isLottoResultGeneratorUnlocked } from "@/lib/admin/lottoResultGeneratorAuth";
import {
  generateLottoResult,
  type LottoGenerateMode,
} from "@/lib/admin/lottoResultGenerator";
import { Prize } from "@/lib/types/prize";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const unlocked = await isLottoResultGeneratorUnlocked();
    if (!unlocked) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }

    const { id: gameId } = await params;
    const body = await request.json();
    const mode = body?.mode as LottoGenerateMode | undefined;
    const difference = Number(body?.difference);
    const count = Number(body?.count);
    const rangeMin = Number(body?.rangeMin);
    const rangeMax = Number(body?.rangeMax);

    if (mode !== "win_equals" && mode !== "win_above" && mode !== "win_below") {
      return NextResponse.json(
        { error: "mode must be win_equals, win_above, or win_below" },
        { status: 400 },
      );
    }

    if (mode !== "win_equals" && (!Number.isFinite(difference) || difference <= 0)) {
      return NextResponse.json(
        { error: "difference must be a positive number" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(count) || count <= 0) {
      return NextResponse.json(
        { error: "count must be a positive integer" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(rangeMin) ||
      !Number.isInteger(rangeMax) ||
      rangeMin < 1 ||
      rangeMax > 99 ||
      rangeMin >= rangeMax
    ) {
      return NextResponse.json(
        { error: "range must be valid integers with 1 <= min < max <= 99" },
        { status: 400 },
      );
    }

    if (count > rangeMax - rangeMin + 1) {
      return NextResponse.json(
        { error: "count cannot exceed the available numbers in range" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServer();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, type")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.type !== "lotto") {
      return NextResponse.json(
        { error: "Result generation is only available for lotto games" },
        { status: 400 },
      );
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets_lotto")
      .select("gameType, staked, under, numbers, prize_id, terminal, status")
      .eq("game_id", gameId);

    if (betsError) {
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const uniquePrizeIds = Array.from(
      new Set((bets || []).map((b) => b.prize_id).filter((id): id is string => !!id)),
    );

    let prizeMap: Record<string, Prize> = {};
    if (uniquePrizeIds.length > 0) {
      const { data: prizesData, error: prizesError } = await supabase
        .from("prize")
        .select("id, name, data, commission")
        .in("id", uniquePrizeIds);

      if (prizesError) {
        return NextResponse.json({ error: prizesError.message }, { status: 500 });
      }

      prizeMap = (prizesData || []).reduce((acc: Record<string, Prize>, prize: Prize) => {
        acc[prize.id] = prize;
        return acc;
      }, {});
    }

    const terminalIds = Array.from(
      new Set((bets || []).map((b) => b.terminal).filter(Boolean)),
    ) as string[];

    let terminalsData: Record<string, { prizes?: unknown }> = {};
    if (terminalIds.length > 0) {
      const { data: terminals, error: terminalsError } = await supabase
        .from("terminal")
        .select("id, prizes")
        .in("id", terminalIds);

      if (terminalsError) {
        return NextResponse.json({ error: terminalsError.message }, { status: 500 });
      }

      terminalsData = (terminals || []).reduce(
        (acc, terminal) => {
          acc[terminal.id] = terminal;
          return acc;
        },
        {} as Record<string, { prizes?: unknown }>,
      );
    }

    const { data: turboPrizeData } = await supabase.from("turbo_prize").select("*").single();

    const result = generateLottoResult(
      bets || [],
      prizeMap,
      terminalsData,
      turboPrizeData,
      {
        mode,
        difference: mode === "win_equals" ? 0 : difference,
        count,
        rangeMin,
        rangeMax,
      },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error generating lotto result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
