import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest, getManagedTerminalIds } from "@/lib/admin/role";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("bets_sport")
      .select("*, games:game_id (week), terminal:terminal(serial_number, agent:agent_id(username))")
      .eq("status", "active")
      .gt("award", 0)
      .order("bet_time", { ascending: false });

    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (roleInfo.role !== "admin") {
      const terminalIds = await getManagedTerminalIds(roleInfo);
      if (!terminalIds?.length) {
        return NextResponse.json({ data: [] }, { status: 200 });
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

    const gameIds = Array.from(new Set(data.map((bet) => bet.game_id).filter(Boolean)));
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
        terminal: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
        tsn: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
        same: 0,
        agent: bet.terminal?.agent ? bet.terminal.agent.username : undefined,
        week: bet.games?.week || null,
        player: bet.player ? playersMap[bet.player] || null : null,
        award: bet.award || 0,
      };
    });

    return NextResponse.json({ data: transformedData || [], matches: matchesMap });
  } catch (error) {
    console.error("Error fetching winning sports bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch winning bets" },
      { status: 500 }
    );
  }
}
