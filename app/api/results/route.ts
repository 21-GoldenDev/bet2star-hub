import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type GameTab = "lotto" | "pools" | "sports" | "sports-draw";

const GAME_TYPE_BY_TAB: Record<GameTab, string> = {
  lotto: "lotto",
  pools: "pools",
  sports: "sports",
  "sports-draw": "sports_draw",
};

type SportsMatchRow = {
  number: number;
  league: string;
  home: string;
  away: string;
  home_goal: number | null;
  away_goal: number | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
};

type WeekResult = {
  id: string;
  week: number;
  game_name?: string | null;
  start_time: string | null;
  end_time: string | null;
  results: Array<number | string>;
  matches: SportsMatchRow[];
};

const normalizeResults = (value: unknown): Array<number | string> => {
  if (!Array.isArray(value)) return [];
  return value;
};

const fetchSportsMatches = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  gameIds: string[],
): Promise<Record<string, SportsMatchRow[]>> => {
  if (!gameIds.length) return {};

  const { data, error } = await supabase
    .from("sports")
    .select("game_id, number, league, home, away, home_goal, away_goal, status, start_time, end_time")
    .in("game_id", gameIds)
    .order("number", { ascending: true });

  if (error || !data) {
    if (error) console.error("Failed to fetch sports matches for results:", error);
    return {};
  }

  return data.reduce<Record<string, SportsMatchRow[]>>((acc, row) => {
    if (!acc[row.game_id]) acc[row.game_id] = [];
    acc[row.game_id].push({
      number: row.number,
      league: row.league,
      home: row.home,
      away: row.away,
      home_goal: row.home_goal,
      away_goal: row.away_goal,
      status: row.status,
      start_time: row.start_time,
      end_time: row.end_time,
    });
    return acc;
  }, {});
};

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const tabs = Object.keys(GAME_TYPE_BY_TAB) as GameTab[];

    const gameResponses = await Promise.all(
      tabs.map(async (tab) => {
        const { data, error } = await supabase
          .from("games")
          .select("id, week, game_name, start_time, end_time, results")
          .eq("type", GAME_TYPE_BY_TAB[tab])
          .order("week", { ascending: false });

        if (error) {
          console.error(`Failed to fetch ${tab} games for results:`, error);
          return { tab, games: [] as WeekResult[] };
        }

        return { tab, games: data || [] };
      }),
    );

    const sportsGameIds = gameResponses
      .filter((entry) => entry.tab === "sports" || entry.tab === "sports-draw")
      .flatMap((entry) => entry.games.map((game) => game.id));

    const matchesByGameId = await fetchSportsMatches(supabase, sportsGameIds);

    const results: Record<GameTab, WeekResult[]> = {
      lotto: [],
      pools: [],
      sports: [],
      "sports-draw": [],
    };

    for (const entry of gameResponses) {
      results[entry.tab] = entry.games.map((game) => ({
        id: game.id,
        week: game.week,
        game_name: game.game_name,
        start_time: game.start_time,
        end_time: game.end_time,
        results: normalizeResults(game.results),
        matches: matchesByGameId[game.id] || [],
      }));
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Results API error:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
