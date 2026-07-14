import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import {
  parseNumberList,
  parsePosInput,
  parseJsonObject,
  pickString,
} from "@/lib/pos/parsePosInput";
import {
  computeSportsPosApl,
  type SportsPosMode,
} from "@/lib/pos/placeSportsPosBet";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { getServiceClient } from "@/lib/supabase/service";
import {
  validateDrawOnlySelections,
  type SportsFlatSelections,
  type SportsGroupedSelections,
} from "@/lib/bets/sportsCombinations";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

async function handleAplRequest(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const input = await parsePosInput(request);
    const mode = pickString(input, "mode", "gameMode", "game_mode") as SportsPosMode;
    const stake = Number(input.stake ?? input.staked ?? input.betAmount);
    const under = parseNumberList(input.under ?? input.matchAtLeast);
    let selections = parseJsonObject(input.selections) as
      | SportsFlatSelections
      | SportsGroupedSelections
      | null;

    const grouping = parseJsonObject(input.grouping) as {
      groupSelections?: SportsGroupedSelections;
    } | null;

    if ((!selections || Object.keys(selections).length === 0) && grouping?.groupSelections) {
      selections = grouping.groupSelections;
    }

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

    if (!selections) {
      return addCORSHeaders(
        NextResponse.json({ error: "selections are required" }, { status: 400 }),
      );
    }

    if (!validateDrawOnlySelections(selections)) {
      return addCORSHeaders(
        NextResponse.json(
          { error: "Sports draw selections must contain only draw (D) options" },
          { status: 400 },
        ),
      );
    }

    const apl = computeSportsPosApl(mode, stake, under.filter((u) => u > 0), selections);

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: {
          apl: Math.round(apl * 100) / 100,
          stake,
          mode,
        },
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to calculate APL";
    return addCORSHeaders(NextResponse.json({ error: message }, { status: 400 }));
  }
}

export async function GET(request: NextRequest) {
  return handleAplRequest(request);
}

export async function POST(request: NextRequest) {
  return handleAplRequest(request);
}
