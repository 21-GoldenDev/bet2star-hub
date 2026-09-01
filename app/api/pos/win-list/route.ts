import { NextRequest, NextResponse } from "next/server";
import { handleCORS } from "@/app/api/middleware/cors";
import { PosError, POS_ERROR_CODES, posErrorResponse, posSuccess } from "@/lib/pos/posErrors";
import { requirePosAuth } from "@/lib/pos/requirePosAuth";
import {
  fetchPosWinList,
  POS_WIN_LIST_DEFAULT_PAGE_SIZE,
  POS_WIN_LIST_MAX_PAGE_SIZE,
} from "@/lib/pos/posWinList";
import { getServiceClient } from "@/lib/supabase/service";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

/**
 * GET /api/pos/win-list
 *
 * Paginated winning tickets for the authenticated terminal on closed games.
 * Designed for printer-safe batches (default page_size 25, max 50).
 *
 * Query:
 *   product   required — lotto | pools | sports | sports-draw | footballpools
 *   page      optional — 1-based, default 1
 *   page_size optional — default 25, max 50
 *   week      optional — game week number
 *   date      optional — YYYY-MM-DD (bet_time day, UTC)
 *   date_from optional — YYYY-MM-DD inclusive start (ignored if date set)
 *   date_to   optional — YYYY-MM-DD inclusive end (ignored if date set)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const auth = await requirePosAuth(request, supabase);
    if (!auth.ok) {
      return auth.response;
    }

    const params = request.nextUrl.searchParams;
    const product = (params.get("product") || "").trim();
    if (!product) {
      throw new PosError(
        POS_ERROR_CODES.INVALID_REQUEST,
        "product is required (lotto, pools, daily-pools, sports, or sports-draw).",
        {
          supported_products: ["lotto", "pools", "daily-pools", "sports", "sports-draw", "footballpools"],
          default_page_size: POS_WIN_LIST_DEFAULT_PAGE_SIZE,
          max_page_size: POS_WIN_LIST_MAX_PAGE_SIZE,
        },
      );
    }

    const result = await fetchPosWinList(supabase, {
      terminalId: auth.payload.terminal_id,
      tsn: auth.payload.serial_number,
      product,
      page: Number(params.get("page") || 1),
      pageSize: Number(params.get("page_size") || params.get("pageSize") || POS_WIN_LIST_DEFAULT_PAGE_SIZE),
      week: params.get("week"),
      date: params.get("date"),
      dateFrom: params.get("date_from") || params.get("dateFrom"),
      dateTo: params.get("date_to") || params.get("dateTo"),
    });

    return posSuccess(result);
  } catch (error: unknown) {
    return posErrorResponse(error);
  }
}
