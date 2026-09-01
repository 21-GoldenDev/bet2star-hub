import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLottoApl, formatLottoWeekLabel } from "@/lib/helpers";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";
import {
  computeSportsPosApl,
  type SportsPosMode,
} from "@/lib/pos/placeSportsPosBet";
import type { GameType } from "@/lib/types/gameMode";

export const POS_WIN_LIST_DEFAULT_PAGE_SIZE = 25;
export const POS_WIN_LIST_MAX_PAGE_SIZE = 50;

export type PosWinListProduct = "lotto" | "pools" | "daily-pools" | "sports" | "sports-draw";

type BetTable = "bets_lotto" | "bets_pools" | "bets_sport" | "bets_sports_draw";

type ProductConfig = {
  product: PosWinListProduct;
  gameType: GameType;
  table: BetTable;
  ticketColumn: "bet_id" | "number";
  selectColumns: string;
};

const PRODUCT_CONFIG: Record<PosWinListProduct, ProductConfig> = {
  lotto: {
    product: "lotto",
    gameType: "lotto",
    table: "bets_lotto",
    ticketColumn: "bet_id",
    selectColumns:
      "id, game_id, bet_id, gameType, under, numbers, staked, award, bet_time, status, prize_id, games!inner(week, game_name, results, end_time), prize:prize_id(name)",
  },
  pools: {
    product: "pools",
    gameType: "pools",
    table: "bets_pools",
    ticketColumn: "bet_id",
    selectColumns:
      "id, game_id, bet_id, gameType, under, matches, staked, award, bet_time, status, prize_id, games!inner(week, game_name, results, end_time, type), prize:prize_id(name)",
  },
  "daily-pools": {
    product: "daily-pools",
    gameType: "daily_pools",
    table: "bets_pools",
    ticketColumn: "bet_id",
    selectColumns:
      "id, game_id, bet_id, gameType, under, matches, staked, award, bet_time, status, prize_id, games!inner(week, game_name, results, end_time, type), prize:prize_id(name)",
  },
  sports: {
    product: "sports",
    gameType: "sports",
    table: "bets_sport",
    ticketColumn: "number",
    selectColumns:
      "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games!inner(week, game_name, end_time)",
  },
  "sports-draw": {
    product: "sports-draw",
    gameType: "sports_draw",
    table: "bets_sports_draw",
    ticketColumn: "number",
    selectColumns:
      "id, game_id, number, mode, under, selections, staked, award, bet_time, status, games!inner(week, game_name, end_time)",
  },
};

export type PosWinListQuery = {
  terminalId: string;
  tsn: string;
  product: string;
  page?: number | string | null;
  pageSize?: number | string | null;
  week?: number | string | null;
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type PosWinListItem = {
  product: PosWinListProduct;
  bet_id: string;
  bet_number: number;
  game_id: string;
  week: number | null;
  week_label: string;
  status: "closed";
  game_mode: string | null;
  mode: string | null;
  under: unknown;
  numbers: unknown;
  matches: unknown;
  selections: unknown;
  stake: number;
  apl: number;
  award: number;
  bet_time: string | null;
  prize_name: string | null;
  tsn: string;
  week_result: number[] | null;
  sports_matches: Array<Record<string, unknown>> | null;
};

export type PosWinListResult = {
  product: PosWinListProduct;
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  items: PosWinListItem[];
};

function normalizeProduct(raw: string): PosWinListProduct {
  const value = raw.trim().toLowerCase();
  if (value === "footballpools" || value === "sports_draw") {
    return "sports-draw";
  }
  if (value === "daily_pools" || value === "daily-pools") {
    return "daily-pools";
  }
  if (value === "lotto" || value === "pools" || value === "sports" || value === "sports-draw") {
    return value;
  }
  throw new PosError(
    POS_ERROR_CODES.INVALID_REQUEST,
    "Invalid or missing product. Use lotto, pools, daily-pools, sports, or sports-draw.",
    {
      supported_products: ["lotto", "pools", "daily-pools", "sports", "sports-draw", "footballpools"],
    },
  );
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function parseOptionalWeek(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_REQUEST,
      "week must be a positive integer.",
      { week: value },
    );
  }
  return n;
}

/** Accepts YYYY-MM-DD; returns UTC day bounds [start, endExclusive). */
function parseDateDayBounds(raw: string, fieldName: string): { start: string; endExclusive: string } {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_REQUEST,
      `${fieldName} must be YYYY-MM-DD.`,
      { [fieldName]: raw },
    );
  }
  const start = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_REQUEST,
      `${fieldName} is not a valid date.`,
      { [fieldName]: raw },
    );
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), endExclusive: end.toISOString() };
}

function unwrapRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] as T) ?? null;
  }
  if (value && typeof value === "object") {
    return value as T;
  }
  return null;
}

function safeApl(compute: () => number): number {
  try {
    const value = compute();
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  } catch {
    return 0;
  }
}

function computeItemApl(
  product: PosWinListProduct,
  row: Record<string, unknown>,
): number {
  const stake = Number(row.staked) || 0;
  if (stake <= 0) return 0;

  if (product === "lotto") {
    return safeApl(() =>
      computeLottoApl(
        String(row.gameType || ""),
        stake,
        Array.isArray(row.under) ? (row.under as number[]) : [],
        (row.numbers as number[] | Record<string, number[]>) || [],
      ),
    );
  }

  if (product === "pools" || product === "daily-pools") {
    return safeApl(() =>
      computeLottoApl(
        String(row.gameType || ""),
        stake,
        Array.isArray(row.under) ? (row.under as number[]) : [],
        (row.matches as number[] | Record<string, string[] | number[]>) || [],
      ),
    );
  }

  const mode = String(row.mode || "direct") as SportsPosMode;
  return safeApl(() =>
    computeSportsPosApl(
      mode,
      stake,
      Array.isArray(row.under) ? (row.under as number[]).map(Number) : [],
      row.selections as never,
    ),
  );
}

export async function fetchPosWinList(
  supabase: SupabaseClient,
  query: PosWinListQuery,
): Promise<PosWinListResult> {
  const product = normalizeProduct(query.product || "");
  const config = PRODUCT_CONFIG[product];

  const page = parsePositiveInt(query.page, 1);
  const requestedSize = parsePositiveInt(query.pageSize, POS_WIN_LIST_DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(POS_WIN_LIST_MAX_PAGE_SIZE, requestedSize);

  const week = parseOptionalWeek(query.week);

  const nowIso = new Date().toISOString();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from(config.table)
    .select(config.selectColumns, { count: "exact" })
    .eq("terminal", query.terminalId)
    .gt("award", 0)
    .neq("status", "void")
    .neq("status", "deleted")
    .lt("games.end_time", nowIso)
    .eq("games.type", config.gameType);

  if (week !== null) {
    dbQuery = dbQuery.eq("games.week", week);
  }

  // Date filters apply to bet_time (ticket placement day).
  if (query.date) {
    const bounds = parseDateDayBounds(query.date, "date");
    dbQuery = dbQuery.gte("bet_time", bounds.start).lt("bet_time", bounds.endExclusive);
  } else {
    if (query.dateFrom) {
      const bounds = parseDateDayBounds(query.dateFrom, "date_from");
      dbQuery = dbQuery.gte("bet_time", bounds.start);
    }
    if (query.dateTo) {
      const bounds = parseDateDayBounds(query.dateTo, "date_to");
      dbQuery = dbQuery.lt("bet_time", bounds.endExclusive);
    }
  }

  // Stable order: ticket number ASC, then row id ASC — no skips/dupes across pages.
  dbQuery = dbQuery
    .order(config.ticketColumn, { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  const { data, error, count } = await dbQuery;

  if (error) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const rows = (data || []) as unknown as Array<Record<string, unknown>>;
  const totalItems = count ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  const gameIds = Array.from(
    new Set(
      rows
        .map((row) => (row.game_id ? String(row.game_id) : ""))
        .filter(Boolean),
    ),
  );

  let matchesByGame: Record<string, Array<Record<string, unknown>>> = {};
  if ((product === "sports" || product === "sports-draw") && gameIds.length > 0) {
    const { data: matchData, error: matchError } = await supabase
      .from("sports")
      .select(
        "game_id, league, number, home, away, home_goal, away_goal, prizes, status, start_time, end_time",
      )
      .in("game_id", gameIds)
      .order("number", { ascending: true });

    if (matchError) {
      throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, matchError.message);
    }

    matchesByGame = (matchData || []).reduce(
      (acc, match) => {
        const gid = String(match.game_id);
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(match as Record<string, unknown>);
        return acc;
      },
      {} as Record<string, Array<Record<string, unknown>>>,
    );
  }

  const items: PosWinListItem[] = rows.map((row) => {
    const game = unwrapRelation<{
      week?: number | null;
      game_name?: string | null;
      results?: unknown;
      end_time?: string | null;
    }>(row.games);

    const prize = unwrapRelation<{ name?: string | null }>(row.prize);
    const weekValue =
      game?.week !== undefined && game?.week !== null ? Number(game.week) : null;
    const weekLabel =
      product === "lotto" && weekValue !== null
        ? formatLottoWeekLabel(weekValue, game?.game_name)
        : weekValue !== null
          ? String(weekValue)
          : "-";

    const betNumber =
      config.ticketColumn === "bet_id" ? Number(row.bet_id) : Number(row.number);

    const weekResult =
      product === "lotto" || product === "pools" || product === "daily-pools"
        ? Array.isArray(game?.results)
          ? (game?.results as number[])
          : []
        : null;

    return {
      product,
      bet_id: String(row.id),
      bet_number: Number.isFinite(betNumber) ? betNumber : 0,
      game_id: String(row.game_id || ""),
      week: weekValue,
      week_label: weekLabel,
      status: "closed",
      game_mode:
        product === "lotto" || product === "pools"
          ? row.gameType
            ? String(row.gameType)
            : null
          : null,
      mode:
        product === "sports" || product === "sports-draw"
          ? row.mode
            ? String(row.mode)
            : null
          : null,
      under: row.under ?? [],
      numbers: product === "lotto" ? row.numbers ?? null : null,
      matches: product === "pools" ? row.matches ?? null : null,
      selections:
        product === "sports" || product === "sports-draw"
          ? row.selections ?? null
          : null,
      stake: Number(row.staked) || 0,
      apl: computeItemApl(product, row),
      award: Number(row.award) || 0,
      bet_time: row.bet_time ? String(row.bet_time) : null,
      prize_name: prize?.name ? String(prize.name) : null,
      tsn: query.tsn,
      week_result: weekResult,
      sports_matches:
        product === "sports" || product === "sports-draw"
          ? matchesByGame[String(row.game_id)] || []
          : null,
    };
  });

  return {
    product,
    page,
    page_size: pageSize,
    total_items: totalItems,
    total_pages: totalPages,
    items,
  };
}
