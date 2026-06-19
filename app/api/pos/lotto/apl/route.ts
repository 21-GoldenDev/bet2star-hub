import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { computeLottoApl } from "@/lib/helpers";
import { gameModes, type GameModeType } from "@/lib/types/gameMode";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const gameMode = (body.gameMode ?? body.game_mode ?? body.gameType) as GameModeType;
    const stake = Number(body.stake ?? body.staked ?? body.betAmount);
    const under = body.under ?? body.matchAtLeast ?? [];
    const numbers = body.numbers ?? body.selectedNumbers ?? [];

    if (!gameMode || !(gameMode in gameModes)) {
      return addCORSHeaders(
        NextResponse.json(
          {
            error: "Invalid or missing gameMode",
            supportedModes: Object.keys(gameModes),
          },
          { status: 400 },
        ),
      );
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      return addCORSHeaders(
        NextResponse.json({ error: "Invalid stake amount" }, { status: 400 }),
      );
    }

    const normalizedUnder = Array.isArray(under)
      ? under.map(Number).filter((u) => Number.isFinite(u) && u > 0)
      : [];

    const apl = computeLottoApl(gameMode, stake, normalizedUnder, numbers);

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: {
          apl: Math.round(apl * 100) / 100,
          stake,
          gameMode,
        },
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to calculate APL";
    return addCORSHeaders(
      NextResponse.json({ error: message }, { status: 400 }),
    );
  }
}
