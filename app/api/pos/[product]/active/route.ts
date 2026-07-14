import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { resolveActiveGame } from "@/lib/pos/resolveActiveGame";
import { getServiceClient } from "@/lib/supabase/service";
import type { GameType } from "@/lib/types/gameMode";
import { dedupePoolsMatchesByNumber } from "@/lib/pools/defaultMatches";

type ProductParam = "lotto" | "pools" | "sports" | "sports-draw" | "footballpools";

function toGameType(product: ProductParam): GameType {
  if (product === "sports-draw" || product === "footballpools") {
    return "sports_draw";
  }
  return product;
}

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ product: string }> },
) {
  try {
    const { product: rawProduct } = await context.params;
    const product = rawProduct as ProductParam;
    const allowed: ProductParam[] = ["lotto", "pools", "sports", "sports-draw", "footballpools"];
    if (!allowed.includes(product)) {
      return addCORSHeaders(
        NextResponse.json(
          {
            error: "Invalid product",
            supportedProducts: allowed,
          },
          { status: 400 },
        ),
      );
    }

    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const gameType = toGameType(product);
    let game;
    try {
      game = await resolveActiveGame(supabase, gameType);
    } catch {
      return addCORSHeaders(
        NextResponse.json({ success: true, data: { game: null, fixtures: [] } }),
      );
    }

    let fixtures: unknown[] = [];

    if (gameType === "pools") {
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "enable")
        .eq("week", game.week)
        .order("number", { ascending: true });
      fixtures = dedupePoolsMatchesByNumber(matchData || []);
    } else if (gameType === "sports" || gameType === "sports_draw") {
      const { data: sports } = await supabase
        .from("sports")
        .select("*")
        .eq("game_id", game.id)
        .order("number", { ascending: true });
      fixtures = sports || [];
    }

    let prizes: Array<{ id: string; name: string }> = [];
    if (gameType === "lotto" || gameType === "pools") {
      const prizeIds = Array.isArray(game.prize_ids)
        ? game.prize_ids
            .filter((p: { status?: string } | string) =>
              typeof p === "string" ? true : p?.status !== "inactive",
            )
            .map((p: { id?: string } | string) => (typeof p === "string" ? p : p.id))
            .filter(Boolean)
        : [];

      if (prizeIds.length > 0) {
        const { data: prizeRows } = await supabase
          .from("prize")
          .select("id, name")
          .in("id", prizeIds);
        prizes = (prizeRows || []).map((p) => ({ id: p.id, name: p.name }));
      }
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: {
          game: {
            id: game.id,
            type: game.type,
            week: game.week,
            start_time: game.start_time,
            end_time: game.end_time,
            visible_numbers: game.visible_numbers ?? null,
            prizes,
          },
          fixtures,
        },
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load active game";
    return addCORSHeaders(NextResponse.json({ error: message }, { status: 500 }));
  }
}
