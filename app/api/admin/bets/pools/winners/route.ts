import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest, getManagedTerminalIds } from "@/lib/admin/role";
import { Prize } from "@/lib/types/prize";
import { NextRequest, NextResponse } from "next/server";

const getUnderValue = (bet: any) => {
  if (bet.gameType === "under1" || bet.gameType === "under2") {
    return Number(bet.gameType.replace("under", ""));
  }
  return bet.under;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("bets_pools")
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

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    let prizeMap: Record<string, Prize> = {};

    const uniquePrizeIds = Array.from(new Set(data.map((bet) => bet.prize_id).filter((id): id is string => id !== null)));

    if (uniquePrizeIds.length > 0) {
      const { data: prizesData, error: prizesError } = await supabase
        .from("prize")
        .select("id, name, data")
        .in("id", uniquePrizeIds);

      if (!prizesError && prizesData) {
        prizeMap = prizesData.reduce((acc, prize) => {
          acc[prize.id] = prize;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    const transformedData = data.map((bet) => ({
      id: bet.id,
      gameId: bet.game_id,
      gameType: bet.gameType,
      betId: bet.bet_id,
      week: bet.games?.week ?? null,
      player: bet.player ? playersMap[bet.player] : undefined,
      under: getUnderValue(bet),
      matches: bet.matches,
      staked: bet.staked,
      terminal: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      tsn: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      same: 0,
      agent: bet.terminal?.agent ? bet.terminal.agent.username : undefined,
      betTime: bet.bet_time,
      prize: bet.prize_id ? prizeMap[bet.prize_id] : undefined,
      award: bet.award,
      status: bet.status,
    }));

    return NextResponse.json({ data: transformedData }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
