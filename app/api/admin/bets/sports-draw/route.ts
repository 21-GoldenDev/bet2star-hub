import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

async function resolveSportsSourceGameId(supabase: any, gameId: string): Promise<string | null> {
  const { data: game, error } = await supabase
    .from("games")
    .select("id, type, week, start_time, end_time")
    .eq("id", gameId)
    .single();

  if (error || !game) return null;
  if (game.type === "sports") return game.id;
  if (game.type !== "sports_draw") return game.id;

  if (Number.isFinite(game.week)) {
    const { data: weekSports, error: weekError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports")
      .eq("week", game.week)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!weekError && weekSports?.id) return weekSports.id;
  }

  if (game.start_time && game.end_time) {
    const { data: overlapSports, error: overlapError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports")
      .lte("start_time", game.end_time)
      .gte("end_time", game.start_time)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!overlapError && overlapSports?.id) return overlapSports.id;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get("week");

    if (!week) {
      return NextResponse.json({ bets: [] });
    }

    const parsedWeek = parseInt(week, 10);
    if (!Number.isFinite(parsedWeek)) {
      return NextResponse.json({ bets: [], matches: {} });
    }

    const { data: drawGames, error: drawGamesError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports_draw")
      .eq("week", parsedWeek);

    if (drawGamesError) throw drawGamesError;

    const drawGameIds = (drawGames || []).map((g) => g.id);
    if (drawGameIds.length === 0) {
      return NextResponse.json({ bets: [], matches: {} });
    }

    const { data, error } = await supabase
      .from("bets_sports_draw")
      .select("*")
      .in("game_id", drawGameIds)
      .eq("status", "active")
      .order("bet_time", { ascending: false });

    if (error) throw error;

    const terminalIds = Array.from(new Set((data || []).map((bet) => bet.terminal).filter(Boolean)));
    let terminalMap: Record<string, { serial_number: string }> = {};

    if (terminalIds.length > 0) {
      const { data: terminals, error: terminalsError } = await supabase
        .from("terminal")
        .select("id, serial_number")
        .in("id", terminalIds);

      if (!terminalsError && terminals) {
        terminalMap = terminals.reduce((acc, terminal) => {
          acc[terminal.id] = { serial_number: terminal.serial_number };
          return acc;
        }, {} as Record<string, { serial_number: string }>);
      }
    }

    const playerIds = data
      .map((bet) => bet.player)
      .filter((id): id is string => id !== null);

    const uniquePlayerIds = Array.from(new Set(playerIds));

    let playersMap: Record<string, { fullName: string; userName: string }> = {};

    if (uniquePlayerIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", uniquePlayerIds);

      if (!usersError && usersData) {
        playersMap = usersData.reduce((acc, user) => {
          acc[user.user_id] = {
            fullName: user.full_name || "",
            userName: user.username || "",
          };
          return acc;
        }, {} as Record<string, { fullName: string; userName: string }>);
      }
    }

    const transformedBets = (data || []).map((bet) => ({
      ...bet,
      player: bet.player ? playersMap[bet.player] || null : null,
      terminal: bet.terminal ? terminalMap[bet.terminal] || null : null,
    }));

    const sourceGameIds = (await Promise.all(
      drawGameIds.map((drawGameId) => resolveSportsSourceGameId(supabase, drawGameId))
    )).filter((id): id is string => Boolean(id));

    let sportsMatchesMap: Record<string, any[]> = {};
    if (sourceGameIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("sports")
        .select("*")
        .in("game_id", sourceGameIds);

      if (!matchesError && matchesData) {
        sportsMatchesMap = matchesData.reduce((acc, match) => {
          if (!acc[match.game_id]) acc[match.game_id] = [];
          acc[match.game_id].push(match);
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    const drawToSourceMap = new Map<string, string>();
    for (const drawGameId of drawGameIds) {
      const sourceId = await resolveSportsSourceGameId(supabase, drawGameId);
      if (sourceId) drawToSourceMap.set(drawGameId, sourceId);
    }

    const matchesMap = transformedBets.reduce((acc, bet) => {
      const sourceId = drawToSourceMap.get(bet.game_id);
      acc[bet.game_id] = sourceId ? (sportsMatchesMap[sourceId] || []) : [];
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      bets: transformedBets,
      matches: matchesMap,
    });
  } catch (error) {
    console.error("Error fetching sports draw bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch bets" },
      { status: 500 }
    );
  }
}
