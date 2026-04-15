import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest, getManagedTerminalIds } from "@/lib/admin/role";

// Removed resolveSportsSourceGameId function - sports_draw now manages its own matches

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

    let query = supabase
      .from("bets_sports_draw")
      .select("*, games:game_id (week, id), terminal:terminal(serial_number, agent:agent_id(username))")
      .in("game_id", drawGameIds)
      .eq("status", "active")
      .order("bet_time", { ascending: false });

    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (roleInfo.role !== "admin") {
      const terminalIds = await getManagedTerminalIds(roleInfo);
      if (!terminalIds?.length) {
        return NextResponse.json({ bets: [], matches: {} });
      }
      query = query.in("terminal", terminalIds);
    }

    const { data, error } = await query;

    if (error) throw error;

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
      week: bet.games?.week,
      player: bet.player ? playersMap[bet.player] || null : null,
      terminal: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      tsn: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      same: 0,
      agent: bet.terminal?.agent ? bet.terminal.agent.username : undefined,
    }));

    // Fetch matches directly from the sports_draw games
    let sportsMatchesMap: Record<string, any[]> = {};
    if (drawGameIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("sports")
        .select("*")
        .in("game_id", drawGameIds);

      if (!matchesError && matchesData) {
        sportsMatchesMap = matchesData.reduce((acc, match) => {
          if (!acc[match.game_id]) acc[match.game_id] = [];
          acc[match.game_id].push(match);
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    const matchesMap = transformedBets.reduce((acc, bet) => {
      acc[bet.game_id] = sportsMatchesMap[bet.game_id] || [];
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
