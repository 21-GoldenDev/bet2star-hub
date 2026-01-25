import { createSupabaseServer } from "@/lib/supabase/server";
import { calcAplDirect, calcAplGrouping, calcAwardLine, parseDraws } from "@/lib/helpers";
import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json({ error: "result must be an array of strings" }, { status: 400 });
    }

    const validResult = result.filter((num) => typeof num === "string");

    const { error: updateError } = await supabase
      .from("games")
      .update({ results: validResult })
      .eq("id", gameId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets_pools")
      .select("id, gameType, staked, under, matches, prize_id, player, status")
      .eq("game_id", gameId);

    if (betsError) {
      console.error("Error fetching bets for award recompute:", betsError);
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    const uniquePrizeIds = Array.from(new Set((bets || []).map((b: any) => b.prize_id).filter((id): id is string => !!id)));

    let prizeMap: Record<string, any> = {};
    if (uniquePrizeIds.length > 0) {
      const { data: prizesData, error: prizesError } = await supabase
        .from("prize")
        .select("id, name, data")
        .in("id", uniquePrizeIds);

      const { data: gamePrizesData, error: gamePrizesError } = await supabase
        .from("game_prizes")
        .select("prize_id, commission")
        .in("prize_id", uniquePrizeIds);

      if (prizesError) {
        console.error("Error fetching prize data:", prizesError);
      }
      if (gamePrizesError) {
        console.error("Error fetching game_prizes data:", gamePrizesError);
      }

      const commissionMap = (gamePrizesData || []).reduce((acc: Record<string, number>, gp: any) => {
        acc[gp.prize_id] = gp.commission || 0;
        return acc;
      }, {});

      prizeMap = (prizesData || []).reduce((acc: Record<string, any>, prize: any) => {
        acc[prize.id] = {
          ...prize,
          commission: commissionMap[prize.id] || 0,
        };
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

    const computeAward = (bet: any, prize: any, weekResult: string[]) => {
      // If bet is void, award equals staked amount
      if (bet.status === "void") return bet.staked || 0;

      if (bet.gameType === "turbo") {
        let turboPrize: number[];
        if (turboPrizeData && turboPrizeData.data) {
          turboPrize = Object.values(turboPrizeData.data) as number[];
        } else {
          turboPrize = [50, 150, 300];
        }
        const betMatches = bet.matches || [];
        if (!Array.isArray(betMatches)) return 0;
        if (betMatches.length === 0) return 0;

        if (weekResult.join(",").includes(betMatches.join(","))) {
          const matchCount = betMatches.length;
          const prizeIndex = Math.min(matchCount - 1, turboPrize.length - 1);
          const award = (turboPrize[prizeIndex] || 0) * (bet.staked || 0);
          return award;
        }
        return 0;
      }

      if (!prize || !prize.data || !prize.data.data || !prize.data.columns) return 0;

      const isNapPerm = bet.gameType === "nap_perm";
      const apl = isNapPerm
        ? calcAplDirect(bet.staked || 0, (bet.under || []).map((u: any) => Number(u)), (bet.matches || []).length)
        : calcAplGrouping(bet.staked || 0, bet.matches || {});

      let award = 0;

      Object.keys(prize.data.data).forEach((drawKey: string) => {
        const parsedDraw = parseDraws(drawKey);
        if (!parsedDraw) return;
        const { start, end } = parsedDraw;
        if (weekResult.length < start || weekResult.length > end) return;

        let multiplier = 0;
        if (isNapPerm) {
          (bet.under || []).forEach((u: any) => {
            const uStr = String(u);
            const columnIndex = prize.data.columns.findIndex((col: string) => col.toUpperCase() === `U${uStr}`);
            if (columnIndex !== -1) {
              const colVal = (prize.data.data?.[drawKey]?.[columnIndex] || 0) as number;
              multiplier += colVal * calcAwardLine(bet.matches || [], weekResult, Number(u));
            }
          });
        } else {
          const awardLine = Object.keys(bet.matches || {}).reduce((acc: number, gid: string) => {
            const ms = (bet.matches as any)?.[gid] || [];
            const u = Number(gid.split("-")[0]);
            return acc * calcAwardLine(ms, weekResult, u);
          }, 1);

          (bet.under || []).forEach((u: any) => {
            const uStr = String(u);
            const columnIndex = prize.data.columns.findIndex((col: string) => col.toUpperCase() === `U${uStr}`);
            if (columnIndex !== -1) {
              const colVal = (prize.data.data?.[drawKey]?.[columnIndex] || 0) as number;
              multiplier += colVal;
            }
          });

          multiplier *= awardLine;
        }

        award = multiplier * apl;
      });

      if (!bet.player) {
        award *= prize?.commission ? prize.commission / 100 : 1;
      }

      if (!Number.isFinite(award)) return 0;
      return award;
    };

    const updates = (bets || []).map((bet: any) => {
      const prize = bet.prize_id ? prizeMap[bet.prize_id] : null;
      const award = computeAward(bet, prize, validResult);
      return { id: bet.id, award };
    });

    const nonNullUpdates = updates.filter((u) => Number.isFinite(u.award));
    if (nonNullUpdates.length > 0) {
      const results = await Promise.all(nonNullUpdates.map((u) =>
        supabase.from("bets_pools").update({ award: u.award }).eq("id", u.id)
      ));
      const failed = results.find((r) => (r as any).error);
      if (failed && (failed as any).error) {
        console.error("Error updating awards:", (failed as any).error);
        return NextResponse.json({ error: (failed as any).error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error setting pools result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
