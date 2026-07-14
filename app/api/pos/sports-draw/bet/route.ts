import { NextRequest } from "next/server";
import { handleCORS } from "@/app/api/middleware/cors";
import {
  parseNumberList,
  parsePosInput,
  parseJsonObject,
  pickString,
} from "@/lib/pos/parsePosInput";
import {
  placeSportsPosBet,
  type SportsPosMode,
} from "@/lib/pos/placeSportsPosBet";
import { PosError, POS_ERROR_CODES, posErrorResponse, posSuccess } from "@/lib/pos/posErrors";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { getServiceClient } from "@/lib/supabase/service";
import type {
  SportsFlatSelections,
  SportsGroupedSelections,
} from "@/lib/bets/sportsCombinations";

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
    const mode = pickString(input, "mode", "gameMode", "game_mode") as SportsPosMode;
    const stake = Number(input.stake ?? input.staked ?? input.betAmount);
    const under = parseNumberList(input.under ?? input.matchAtLeast);
    const selections = parseJsonObject(input.selections) as
      | SportsFlatSelections
      | SportsGroupedSelections
      | null;
    const grouping = parseJsonObject(input.grouping) as {
      selectedUs: Array<{ id: string; u: number }>;
      groupSelections: SportsGroupedSelections;
    } | null;
    const onebanker = parseJsonObject(input.onebanker ?? input.one_banker) as {
      bankerMatchId?: string | number;
      selections?: SportsGroupedSelections;
    } | null;

    if (!mode) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_MODE,
        "Invalid or missing mode",
        { supportedModes: ["direct", "permutation", "grouping", "one_banker"] },
      );
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      throw new PosError(POS_ERROR_CODES.INVALID_STAKE, "Invalid stake amount");
    }

    const result = await placeSportsPosBet(supabase, "sports_draw", {
      tsn: auth.payload.serial_number,
      gameId,
      mode,
      stake,
      under: under.filter((u) => u > 0),
      selections: selections || undefined,
      grouping: grouping || undefined,
      onebanker: onebanker || undefined,
    });

    return posSuccess(result);
  } catch (error: unknown) {
    return posErrorResponse(error);
  }
}
