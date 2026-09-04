import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { formatLottoWeekLabel } from "@/lib/helpers";
import { getServiceClient } from "@/lib/supabase/service";

export type PublicBetProduct = "lotto" | "pools" | "daily-pools" | "sports" | "sports-draw";

type LookupHit = {
  product: PublicBetProduct;
  row: Record<string, unknown>;
};

type GameInfo = {
  week?: number | null;
  game_name?: string | null;
  results?: unknown;
  end_time?: string | null;
  type?: string | null;
};

function resolvePublicStatus(
  rawStatus: unknown,
  _product: PublicBetProduct,
  game: GameInfo | null,
): "active" | "closed" | "void" {
  const status = String(rawStatus || "active").toLowerCase();
  if (status === "void") return "void";
  if (status === "closed") return "closed";

  // Game is closed only after its end time — results alone do not close an active week
  if (game?.end_time) {
    const end = new Date(game.end_time).getTime();
    if (Number.isFinite(end) && Date.now() > end) {
      return "closed";
    }
  }

  return "active";
}

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
          "id, game_id, bet_id, gameType, under, numbers, staked, award, bet_time, status, games:game_id (week, game_name, results, end_time), prize:prize_id (name)",
        )
        .eq("bet_id", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_pools")
        .select(
          "id, game_id, bet_id, gameType, under, matches, staked, award, bet_time, status, games:game_id (week, results, end_time, type), prize:prize_id (name)",
        )
        .eq("bet_id", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_sport")
        .select(
          "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week, end_time)",
        )
        .eq("number", betNumber)
        .maybeSingle(),
      supabase
        .from("bets_sports_draw")
        .select(
          "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week, end_time)",
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
    if (pools.data) {
      const poolsGamesRaw = (pools.data as Record<string, unknown>).games;
      const poolsGame = Array.isArray(poolsGamesRaw) ? poolsGamesRaw[0] : poolsGamesRaw;
      const poolsType = poolsGame && typeof poolsGame === "object"
        ? String((poolsGame as { type?: string }).type || "pools")
        : "pools";
      hits.push({
        product: poolsType === "daily_pools" ? "daily-pools" : "pools",
        row: pools.data as Record<string, unknown>,
      });
    }
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
    const game = (games && typeof games === "object" ? games : null) as GameInfo | null;

    const prizeRaw = hit.row.prize;
    const prize = Array.isArray(prizeRaw) ? prizeRaw[0] : prizeRaw;
    const prizeName =
      prize && typeof prize === "object" && "name" in prize
        ? String((prize as { name?: string }).name || "")
        : "";

    const weekValue = game?.week;
    const weekLabel =
      (hit.product === "lotto" || hit.product === "daily-pools") && typeof weekValue === "number"
        ? formatLottoWeekLabel(weekValue, game?.game_name)
        : weekValue !== null && weekValue !== undefined
          ? String(weekValue)
          : "-";

    const status = resolvePublicStatus(hit.row.status, hit.product, game);
    const isClosed = status === "closed";

    let sportsMatches: Array<Record<string, unknown>> = [];
    let poolsMatches: Array<Record<string, unknown>> = [];
    if ((hit.product === "sports" || hit.product === "sports-draw") && hit.row.game_id) {
      const { data: matchData, error: matchError } = await supabase
        .from("sports")
        .select("league, number, home, away, home_goal, away_goal, prizes, status, start_time, end_time")
        .eq("game_id", hit.row.game_id);

      if (matchError) {
        console.error("Public bet lookup sports matches error:", matchError);
      } else {
        sportsMatches = (matchData || []).map((match) => {
          if (isClosed) return match;
          // Hide scores until the bet/game is closed
          return {
            ...match,
            home_goal: null,
            away_goal: null,
          };
        });
      }
    }

    if (hit.product === "daily-pools" && typeof game?.week === "number") {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("number, home, away")
        .eq("week", game.week)
        .eq("game_type", "daily_pools")
        .order("number", { ascending: true });

      if (matchError) {
        console.error("Public bet lookup daily pools matches error:", matchError);
      } else {
        poolsMatches = matchData || [];
      }
    }

    const betNumberValue =
      hit.product === "lotto" || hit.product === "pools" || hit.product === "daily-pools"
        ? Number(hit.row.bet_id)
        : Number(hit.row.number);

    return addCORSHeaders(
      NextResponse.json({
        bet: {
          product: hit.product,
          betNumber: betNumberValue,
          status,
          gameType: hit.row.gameType ? String(hit.row.gameType) : null,
          mode: hit.row.mode ? String(hit.row.mode) : null,
          under: hit.row.under ?? [],
          numbers: hit.row.numbers ?? null,
          matches: hit.row.matches ?? null,
          selections: hit.row.selections ?? null,
          staked: Number(hit.row.staked) || 0,
          award: isClosed ? Number(hit.row.award) || 0 : null,
          betTime: hit.row.bet_time ? String(hit.row.bet_time) : null,
          week: weekLabel,
          option: prizeName || null,
          weekResult: isClosed && Array.isArray(game?.results) ? game.results : [],
          sportsMatches,
          poolsMatches,
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
