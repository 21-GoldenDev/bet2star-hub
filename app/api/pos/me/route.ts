import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import {
  getDefaultTerminalPrizeId,
  isTerminalPrizeActive,
  normalizeTerminalPrizeEntries,
} from "@/lib/terminals/terminalPrize";
import { getServiceClient } from "@/lib/supabase/service";
import type { GameType } from "@/lib/types/gameMode";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const { data: terminal, error } = await supabase
      .from("terminal")
      .select(
        "id, serial_number, status, credit_limit, max_stake, game_modes, prizes, agent_id",
      )
      .eq("id", auth.payload.terminal_id)
      .maybeSingle();

    if (error) {
      return addCORSHeaders(
        NextResponse.json({ error: error.message }, { status: 500 }),
      );
    }

    if (!terminal) {
      return addCORSHeaders(
        NextResponse.json({ error: "Terminal not found." }, { status: 401 }),
      );
    }

    const { data: agent } = await supabase
      .from("agent")
      .select("id, username, first_name, last_name, status")
      .eq("id", terminal.agent_id)
      .maybeSingle();

    const prizeEntries = normalizeTerminalPrizeEntries(terminal.prizes);
    const activePrizeIds = prizeEntries
      .filter(isTerminalPrizeActive)
      .map((e) => e.prize_id);

    const prizeNameById = new Map<string, string>();
    if (activePrizeIds.length > 0) {
      const { data: prizeRows } = await supabase
        .from("prize")
        .select("id, name")
        .in("id", activePrizeIds);
      for (const row of prizeRows || []) {
        prizeNameById.set(String(row.id), String(row.name || row.id));
      }
    }

    const prizes = prizeEntries.map((entry) => ({
      prize_id: entry.prize_id,
      name: prizeNameById.get(entry.prize_id) || entry.prize_id,
      commission: entry.commission,
      default: entry.default,
      status: entry.status,
    }));

    const activePrizes = prizes.filter((p) => p.status === "active");
    const defaultPrizeId = getDefaultTerminalPrizeId(terminal.prizes);
    const defaultPrize =
      activePrizes.find((p) => p.prize_id === defaultPrizeId) ||
      activePrizes.find((p) => p.default) ||
      null;

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: {
          terminal: {
            id: terminal.id,
            serial_number: terminal.serial_number,
          },
          agent: agent || null,
          credit_limit: Number(terminal.credit_limit || 0),
          max_stake: Number(terminal.max_stake || 0),
          allowed_products: (Array.isArray(terminal.game_modes)
            ? terminal.game_modes
            : []) as GameType[],
          prizes: {
            active: activePrizes,
            default: defaultPrize,
          },
          status: terminal.status,
        },
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load session";
    return addCORSHeaders(NextResponse.json({ error: message }, { status: 500 }));
  }
}
