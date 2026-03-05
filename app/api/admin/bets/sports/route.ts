import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

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

    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id")
      .eq("type", "sports")
      .eq("week", parsedWeek);

    if (gamesError) throw gamesError;

    const gameIds = (games || []).map((g) => g.id);

    const { data, error } = await supabase
      .from("bets_sport")
      .select("*, games:game_id (week), terminal:terminal(serial_number, agent:agent_id(username))")
      .in("game_id", gameIds)
      .eq("status", "active")
      .order("bet_time", { ascending: false });

    if (error) throw error;

    // Fetch user data separately for bets with players
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
        playersMap = usersData
          .filter((user) => uniquePlayerIds.includes(user.user_id))
          .reduce((acc, user) => {
            acc[user.user_id] = {
              fullName: user.full_name || "",
              userName: user.username || "",
            };
            return acc;
          }, {} as Record<string, { fullName: string; userName: string }>);
      }
    }

    let matchesMap: Record<string, any[]> = {};

    if (gameIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("sports")
        .select("*")
        .in("game_id", gameIds);

      if (!matchesError && matchesData) {
        matchesMap = matchesData.reduce((acc, match) => {
          if (!acc[match.game_id]) acc[match.game_id] = [];
          acc[match.game_id].push(match);
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    const transformedData = data?.map((bet) => {
      return {
        ...bet,
        week: week,
        player: bet.player ? playersMap[bet.player] || null : null,
        terminal: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
        tsn: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
        same: 0,
        agent: bet.terminal?.agent ? bet.terminal.agent.username : undefined,
      };
    });

    return NextResponse.json({ bets: transformedData || [], matches: matchesMap });
  } catch (error) {
    console.error("Error fetching bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch bets" },
      { status: 500 }
    );
  }
}
