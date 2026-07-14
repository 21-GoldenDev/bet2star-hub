import { NextRequest } from "next/server";
import { handleCORS } from "@/app/api/middleware/cors";
import { placeLottoPosBet } from "@/lib/pos/placeLottoPosBet";
import {
  parseNumbers,
  parseNumberList,
  parsePosInput,
  parseJsonObject,
  pickString,
} from "@/lib/pos/parsePosInput";
import { PosError, POS_ERROR_CODES, posErrorResponse, posSuccess } from "@/lib/pos/posErrors";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { gameModes, type GameModeType } from "@/lib/types/gameMode";
import { getServiceClient } from "@/lib/supabase/service";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new Response(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const input = await parsePosInput(request);
    const requestedTsn = pickString(input, "tsn", "TSN", "serial_number", "terminal");
    if (requestedTsn && requestedTsn !== auth.payload.serial_number) {
      throw new PosError(
        POS_ERROR_CODES.SERIAL_MISMATCH,
        "Serial number does not match authenticated terminal.",
      );
    }

    const gameId = pickString(input, "gameId", "game_id") || undefined;
    const gameMode = pickString(input, "gameMode", "game_mode", "gameType") as GameModeType;
    const stake = Number(input.stake ?? input.staked ?? input.betAmount);
    const prizeId = pickString(input, "prize", "prize_id", "prizeId") || undefined;
    const under = parseNumberList(input.under ?? input.matchAtLeast);
    const numbers = parseNumbers(input.numbers ?? input.selectedNumbers);
    const grouping = parseJsonObject(input.grouping) as {
      selectedUs: Array<{ id: string; u: number }>;
      groupSelections: Record<string, number[]>;
    } | null;
    const twobanker = parseJsonObject(input.twobanker ?? input.two_banker) as {
      groupAU: number;
      groupANumbers: number[];
      totalUnder: number;
    } | null;
    const onebanker = parseJsonObject(input.onebanker ?? input.one_banker) as {
      groupANumbers: number[];
    } | null;

    if (!gameMode || !(gameMode in gameModes)) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_MODE,
        "Invalid or missing gameMode",
        { supportedModes: Object.keys(gameModes) },
      );
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      throw new PosError(POS_ERROR_CODES.INVALID_STAKE, "Invalid stake amount");
    }

    const result = await placeLottoPosBet(supabase, {
      tsn: auth.payload.serial_number,
      gameId,
      gameMode,
      stake,
      under: under.filter((u) => u > 0),
      numbers,
      grouping: grouping || undefined,
      twobanker: twobanker || undefined,
      onebanker: onebanker || undefined,
      prizeId,
    });

    return posSuccess(result);
  } catch (error: unknown) {
    return posErrorResponse(error);
  }
}
