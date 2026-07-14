import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
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
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { getServiceClient } from "@/lib/supabase/service";
import type {
  SportsFlatSelections,
  SportsGroupedSelections,
} from "@/lib/bets/sportsCombinations";

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
      return addCORSHeaders(
        NextResponse.json(
          {
            error: "Invalid or missing mode",
            supportedModes: ["direct", "permutation", "grouping", "one_banker"],
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

    return addCORSHeaders(NextResponse.json({ success: true, data: result }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to place bet";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("inactive")
          ? 401
          : 400;
    return addCORSHeaders(NextResponse.json({ error: message }, { status }));
  }
}

export async function GET(request: NextRequest) {
  return handleBetRequest(request);
}

export async function POST(request: NextRequest) {
  return handleBetRequest(request);
}
