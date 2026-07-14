import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { placeLottoPosBet } from "@/lib/pos/placeLottoPosBet";
import { parseNumbers, parseNumberList, parsePosInput, pickString } from "@/lib/pos/parsePosInput";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { gameModes, type GameModeType } from "@/lib/types/gameMode";
import { getServiceClient } from "@/lib/supabase/service";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

async function handleBetRequest(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const input = await parsePosInput(request);

    const requestedTsn = pickString(input, "tsn", "TSN", "serial_number", "terminal");
    if (requestedTsn && requestedTsn !== auth.payload.serial_number) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Serial number does not match authenticated terminal." },
          { status: 403 },
        ),
      );
    }

    const tsn = auth.payload.serial_number;
    const gameId = pickString(input, "gameId", "game_id") || undefined;
    const gameMode = pickString(input, "gameMode", "game_mode", "gameType") as GameModeType;
    const stake = Number(input.stake ?? input.staked ?? input.betAmount);
    const prizeId = pickString(input, "prize", "prize_id", "prizeId") || undefined;
    const under = parseNumberList(input.under ?? input.matchAtLeast);
    const numbers = parseNumbers(input.numbers ?? input.selectedNumbers);

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

    const result = await placeLottoPosBet(supabase, {
      tsn,
      gameId,
      gameMode,
      stake,
      under: under.filter((u) => u > 0),
      numbers,
      prizeId,
    });

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: result,
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to place bet";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("inactive")
          ? 401
          : 400;
    return addCORSHeaders(
      NextResponse.json({ error: message }, { status }),
    );
  }
}

export async function GET(request: NextRequest) {
  return handleBetRequest(request);
}

export async function POST(request: NextRequest) {
  return handleBetRequest(request);
}
