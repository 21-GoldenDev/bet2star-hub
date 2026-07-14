import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { computeLottoApl } from "@/lib/helpers";
import {
  parseMatches,
  parseNumberList,
  parsePosInput,
  parseJsonObject,
  pickString,
} from "@/lib/pos/parsePosInput";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import { gameModes, type GameModeType } from "@/lib/types/gameMode";
import { getServiceClient } from "@/lib/supabase/service";

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
    const gameMode = pickString(input, "gameMode", "game_mode", "gameType") as GameModeType;
    const stake = Number(input.stake ?? input.staked ?? input.betAmount);
    const under = parseNumberList(input.under ?? input.matchAtLeast);
    let matches = parseMatches(input.matches ?? input.selectedMatches ?? input.numbers);

    const grouping = parseJsonObject(input.grouping) as {
      selectedUs?: Array<{ id: string; u: number }>;
      groupSelections?: Record<string, string[]>;
    } | null;

    if (gameMode === "grouping" && grouping?.selectedUs && grouping.groupSelections) {
      const shaped: Record<string, string[]> = {};
      for (const sel of grouping.selectedUs) {
        shaped[`${sel.u}-${sel.id}`] = grouping.groupSelections[sel.id] || [];
      }
      matches = shaped;
    }

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

    const apl = computeLottoApl(gameMode, stake, under.filter((u) => u > 0), matches as never);

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
    return addCORSHeaders(NextResponse.json({ error: message }, { status: 400 }));
  }
}

export async function GET(request: NextRequest) {
  return handleAplRequest(request);
}

export async function POST(request: NextRequest) {
  return handleAplRequest(request);
}
