import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type BetTab = "lotto" | "pools" | "sports" | "sports-draw";

const GAME_TYPE_BY_TAB: Record<BetTab, string> = {
  lotto: "lotto",
  pools: "pools",
  sports: "sports",
  "sports-draw": "sports_draw",
};

const isValidTab = (value: string | null): value is BetTab => {
  return value === "lotto" || value === "pools" || value === "sports" || value === "sports-draw";
};

const resolveDefaultWeek = async (supabase: Awaited<ReturnType<typeof createSupabaseServer>>, tab: BetTab) => {
  const gameType = GAME_TYPE_BY_TAB[tab];
  const now = new Date().toISOString();

  const { data: activeGame } = await supabase
    .from("games")
    .select("week")
    .eq("type", gameType)
    .lte("start_time", now)
    .gte("end_time", now)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (typeof activeGame?.week === "number" && Number.isFinite(activeGame.week)) {
    return activeGame.week;
  }

  const { data: latestGame } = await supabase
    .from("games")
    .select("week")
    .eq("type", gameType)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (typeof latestGame?.week === "number" && Number.isFinite(latestGame.week)) {
    return latestGame.week;
  }

  return null;
};

const extractWeeks = (rows: any[] | null) => {
  const weeks = Array.from(
    new Set(
      (rows || [])
        .map((row) => row?.games?.week)
        .filter((week) => typeof week === "number" && Number.isFinite(week)),
    ),
  ) as number[];

  return weeks.sort((a, b) => b - a);
};

const formatMode = (mode?: string | null) => {
  if (!mode) return "-";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tabParam = request.nextUrl.searchParams.get("tab");
    if (!isValidTab(tabParam)) {
      return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
    }

    const pageParam = Number(request.nextUrl.searchParams.get("page") || "1");
    const pageSizeParam = Number(request.nextUrl.searchParams.get("pageSize") || "20");

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(100, Math.floor(pageSizeParam))
      : 20;

    const weekParam = (request.nextUrl.searchParams.get("week") || "").trim();
    const betIdParam = (request.nextUrl.searchParams.get("betId") || "").trim();
    const betAboveParam = (request.nextUrl.searchParams.get("betAbove") || "").trim();

    const weekFilter = weekParam ? Number(weekParam) : undefined;
    const betIdFilter = betIdParam ? Number(betIdParam) : undefined;
    const betAboveFilter = betAboveParam ? Number(betAboveParam) : undefined;

    if (weekParam && !Number.isFinite(weekFilter)) {
      return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
    }

    if (betIdParam && !Number.isFinite(betIdFilter)) {
      return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
    }

    if (betAboveParam && !Number.isFinite(betAboveFilter)) {
      return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let effectiveWeekFilter: number | undefined = Number.isFinite(weekFilter) ? weekFilter : undefined;
    if (effectiveWeekFilter === undefined) {
      const defaultWeek = await resolveDefaultWeek(supabase, tabParam);
      if (defaultWeek != null) {
        effectiveWeekFilter = defaultWeek;
      }
    }

    let query;
    let weeksQuery;
    let summaryQuery;

    if (tabParam === "lotto") {
      query = supabase
        .from("bets_lotto")
        .select("id, bet_id, gameType, under, numbers, staked, award, bet_time, status, games:game_id (week), prize:prize_id (name)", { count: "exact" })
        .eq("player", user.id)
        .or("status.is.null,status.neq.void")
        .order("bet_time", { ascending: false })
        .range(from, to);

      weeksQuery = supabase
        .from("bets_lotto")
        .select("games:game_id (week)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      summaryQuery = supabase
        .from("bets_lotto")
        .select("gameType, under, staked, award, games:game_id (week), prize:prize_id (name)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      if (Number.isFinite(effectiveWeekFilter)) query = query.eq("games.week", effectiveWeekFilter);
      if (Number.isFinite(betIdFilter)) query = query.eq("bet_id", betIdFilter);
      if (Number.isFinite(betAboveFilter)) query = query.gt("staked", betAboveFilter);

      if (Number.isFinite(betIdFilter)) weeksQuery = weeksQuery.eq("bet_id", betIdFilter);
      if (Number.isFinite(betAboveFilter)) weeksQuery = weeksQuery.gt("staked", betAboveFilter);

      if (Number.isFinite(effectiveWeekFilter)) summaryQuery = summaryQuery.eq("games.week", effectiveWeekFilter);
    } else if (tabParam === "pools") {
      query = supabase
        .from("bets_pools")
        .select("id, bet_id, gameType, under, matches, staked, award, bet_time, status, games:game_id (week), prize:prize_id (name)", { count: "exact" })
        .eq("player", user.id)
        .or("status.is.null,status.neq.void")
        .order("bet_time", { ascending: false })
        .range(from, to);

      weeksQuery = supabase
        .from("bets_pools")
        .select("games:game_id (week)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      summaryQuery = supabase
        .from("bets_pools")
        .select("gameType, under, staked, award, games:game_id (week), prize:prize_id (name)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      if (Number.isFinite(effectiveWeekFilter)) query = query.eq("games.week", effectiveWeekFilter);
      if (Number.isFinite(betIdFilter)) query = query.eq("bet_id", betIdFilter);
      if (Number.isFinite(betAboveFilter)) query = query.gt("staked", betAboveFilter);

      if (Number.isFinite(betIdFilter)) weeksQuery = weeksQuery.eq("bet_id", betIdFilter);
      if (Number.isFinite(betAboveFilter)) weeksQuery = weeksQuery.gt("staked", betAboveFilter);

      if (Number.isFinite(effectiveWeekFilter)) summaryQuery = summaryQuery.eq("games.week", effectiveWeekFilter);
    } else if (tabParam === "sports") {
      query = supabase
        .from("bets_sport")
        .select("id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week)", { count: "exact" })
        .eq("player", user.id)
        .or("status.is.null,status.neq.void")
        .order("bet_time", { ascending: false })
        .range(from, to);

      weeksQuery = supabase
        .from("bets_sport")
        .select("games:game_id (week)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      summaryQuery = null;

      if (Number.isFinite(effectiveWeekFilter)) query = query.eq("games.week", effectiveWeekFilter);
      if (Number.isFinite(betIdFilter)) query = query.eq("number", betIdFilter);
      if (Number.isFinite(betAboveFilter)) query = query.gt("staked", betAboveFilter);

      if (Number.isFinite(betIdFilter)) weeksQuery = weeksQuery.eq("number", betIdFilter);
      if (Number.isFinite(betAboveFilter)) weeksQuery = weeksQuery.gt("staked", betAboveFilter);
    } else {
      query = supabase
        .from("bets_sports_draw")
        .select("id, game_id, number, mode, under, selections, staked, award, bet_time, status, games:game_id (week)", { count: "exact" })
        .eq("player", user.id)
        .or("status.is.null,status.neq.void")
        .order("bet_time", { ascending: false })
        .range(from, to);

      weeksQuery = supabase
        .from("bets_sports_draw")
        .select("games:game_id (week)")
        .eq("player", user.id)
        .or("status.is.null,status.neq.void");

      summaryQuery = null;

      if (Number.isFinite(effectiveWeekFilter)) query = query.eq("games.week", effectiveWeekFilter);
      if (Number.isFinite(betIdFilter)) query = query.eq("number", betIdFilter);
      if (Number.isFinite(betAboveFilter)) query = query.gt("staked", betAboveFilter);

      if (Number.isFinite(betIdFilter)) weeksQuery = weeksQuery.eq("number", betIdFilter);
      if (Number.isFinite(betAboveFilter)) weeksQuery = weeksQuery.gt("staked", betAboveFilter);
    }

    const [{ data, error, count }, { data: weekRows, error: weekError }, summaryResp] = await Promise.all([
      query,
      weeksQuery,
      summaryQuery
        ? summaryQuery
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: any }),
    ]);

    const summaryRows = summaryResp?.data || [];
    const summaryError = summaryResp?.error || null;

    if (error) {
      console.error("Failed to fetch bet history:", error);
      return NextResponse.json({ error: "Failed to fetch bet history" }, { status: 500 });
    }

    if (weekError) {
      console.error("Failed to fetch week options:", weekError);
    }

    if (summaryError) {
      console.error("Failed to fetch summary:", summaryError);
    }

    const summaryMap = new Map<string, { option: string; sales: number; winnings: number }>();
    if (tabParam === "lotto" || tabParam === "pools") {
      for (const row of summaryRows || []) {
        let option = "-";
        if (!(row as any).prize && row.gameType === "turbo") {
          option = `Turbo ${row.under[0]}`;
        } else if ((row as any).prize) {
          option = Array.isArray((row as any).prize)
            ? ((row as any).prize[0]?.name || "-")
            : ((row as any).prize.name || "-");
        }

        const sales = Number((row as any).staked) || 0;
        const winnings = Number((row as any).award) || 0;

        const current = summaryMap.get(option) || { option, sales: 0, winnings: 0 };
        current.sales += sales;
        current.winnings += winnings;
        summaryMap.set(option, current);
      }
    }

    const summary = Array.from(summaryMap.values()).sort((a, b) => a.option.localeCompare(b.option));

    let matches: Record<string, any[]> = {};
    if ((tabParam === "sports" || tabParam === "sports-draw") && Array.isArray(data) && data.length > 0) {
      const gameIds = Array.from(new Set(data.map((row: any) => row.game_id).filter(Boolean)));
      if (gameIds.length > 0) {
        const { data: matchData, error: matchError } = await supabase
          .from("sports")
          .select("game_id, league, number, home, away, home_goal, away_goal, prizes, status, start_time, end_time")
          .in("game_id", gameIds);

        if (matchError) {
          console.error("Failed to fetch sports matches:", matchError);
        } else {
          matches = (matchData || []).reduce((acc, match: any) => {
            if (!acc[match.game_id]) acc[match.game_id] = [];
            acc[match.game_id].push(match);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }
    }

    const betWeeks = extractWeeks(weekRows || []);
    const appliedWeek = effectiveWeekFilter ?? betWeeks[0] ?? null;
    const weeks = Array.from(
      new Set([
        ...(appliedWeek != null ? [appliedWeek] : []),
        ...betWeeks,
      ]),
    ).sort((a, b) => b - a);

    return NextResponse.json({
      data: data || [],
      weeks,
      appliedWeek,
      matches,
      summary,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("Bet history API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
