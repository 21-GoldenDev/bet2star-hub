import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { formatLottoWeekLabel } from "@/lib/helpers";
import { getServiceClient } from "@/lib/supabase/service";

export type PublicBetProduct = "lotto" | "pools" | "sports" | "sports-draw";

type LookupHit = {
  product: PublicBetProduct;
  row: Record<string, unknown>;
};

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const betIdParam = (request.nextUrl.searchParams.get("betId") || "").trim();
    const betNumber = Number(betIdParam);

    if (!betIdParam || !Number.isFinite(betNumber) || betNumber < 1 || !Number.isInteger(betNumber)) {
      return addCORSHeaders(
        NextResponse.json({ error: "Enter a valid Bet ID" }, { status: 400 }),
      );
    }

    const supabase = getServiceClient();

    const [lotto, pools, sports, sportsDraw] = await Promise.all([
      supabase
        .from("bets_lotto")
        .select(
          "id, game_id, bet_id, gameType, under, numbers, staked, award, bet_time, status, games:game_id (week, game_name, results), prize:prize_id (name)",
        )
        .eq("bet_id", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_pools")
        .select(
          "id, game_id, bet_id, gameType, under, matches, staked, award, bet_time, status, games:game_id (week, results), prize:prize_id (name)",
        )
        .eq("bet_id", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_sport")
        .select(
          "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week)",
        )
        .eq("number", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_sports_draw")
        .select(
          "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week)",
        )
        .eq("number", betNumber)
        .maybeSingle(),
    ]);

    for (const result of [lotto, pools, sports, sportsDraw]) {
      if (result.error) {
        console.error("Public bet lookup error:", result.error);
        return addCORSHeaders(
          NextResponse.json({ error: "Failed to look up bet" }, { status: 500 }),
        );
      }
    }

    const hits: LookupHit[] = [];
    if (lotto.data) hits.push({ product: "lotto", row: lotto.data as Record<string, unknown> });
    if (pools.data) hits.push({ product: "pools", row: pools.data as Record<string, unknown> });
    if (sports.data) hits.push({ product: "sports", row: sports.data as Record<string, unknown> });
    if (sportsDraw.data) {
      hits.push({ product: "sports-draw", row: sportsDraw.data as Record<string, unknown> });
    }

    if (hits.length === 0) {
      return addCORSHeaders(
        NextResponse.json({ error: "No bet found for this Bet ID" }, { status: 404 }),
      );
    }

    // Prefer earliest bet_time if duplicates somehow remain
    hits.sort((a, b) => {
      const aTime = new Date(String(a.row.bet_time || 0)).getTime();
      const bTime = new Date(String(b.row.bet_time || 0)).getTime();
      return aTime - bTime;
    });

    const hit = hits[0];
    const gamesRaw = hit.row.games;
    const games = Array.isArray(gamesRaw) ? gamesRaw[0] : gamesRaw;
    const game = (games && typeof games === "object" ? games : null) as {
      week?: number | null;
      game_name?: string | null;
      results?: unknown;
    } | null;

    const prizeRaw = hit.row.prize;
    const prize = Array.isArray(prizeRaw) ? prizeRaw[0] : prizeRaw;
    const prizeName =
      prize && typeof prize === "object" && "name" in prize
        ? String((prize as { name?: string }).name || "")
        : "";

    const weekValue = game?.week;
    const weekLabel =
      hit.product === "lotto" && typeof weekValue === "number"
        ? formatLottoWeekLabel(weekValue, game?.game_name)
        : weekValue !== null && weekValue !== undefined
          ? String(weekValue)
          : "-";

    let sportsMatches: Array<Record<string, unknown>> = [];
    if ((hit.product === "sports" || hit.product === "sports-draw") && hit.row.game_id) {
      const { data: matchData, error: matchError } = await supabase
        .from("sports")
        .select("league, number, home, away, home_goal, away_goal, prizes, status, start_time, end_time")
        .eq("game_id", hit.row.game_id);

      if (matchError) {
        console.error("Public bet lookup sports matches error:", matchError);
      } else {
        sportsMatches = matchData || [];
      }
    }

    const betNumberValue =
      hit.product === "lotto" || hit.product === "pools"
        ? Number(hit.row.bet_id)
        : Number(hit.row.number);

    return addCORSHeaders(
      NextResponse.json({
        bet: {
          product: hit.product,
          betNumber: betNumberValue,
          status: String(hit.row.status || "active"),
          gameType: hit.row.gameType ? String(hit.row.gameType) : null,
          mode: hit.row.mode ? String(hit.row.mode) : null,
          under: hit.row.under ?? [],
          numbers: hit.row.numbers ?? null,
          matches: hit.row.matches ?? null,
          selections: hit.row.selections ?? null,
          staked: Number(hit.row.staked) || 0,
          award: Number(hit.row.award) || 0,
          betTime: hit.row.bet_time ? String(hit.row.bet_time) : null,
          week: weekLabel,
          option: prizeName || null,
          weekResult: Array.isArray(game?.results) ? game.results : [],
          sportsMatches,
        },
      }),
    );
  } catch (error) {
    console.error("Public bet lookup error:", error);
    return addCORSHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
}
