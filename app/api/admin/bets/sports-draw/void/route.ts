import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest, getManagedTerminalIds } from "@/lib/admin/role";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("bets_sports_draw")
      .select("*, games:game_id (week, id), terminal:terminal(serial_number, agent:agent_id(username))")
      .eq("status", "void")
      .order("updated_at", { ascending: false });

    const roleInfo = await getAdminRoleFromRequest(_request);
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
        playersMap = usersData.reduce((acc, user) => {
          acc[user.user_id] = {
            fullName: user.full_name || "",
            userName: user.username || "",
          };
          return acc;
        }, {} as Record<string, { fullName: string; userName: string }>);
      }
    }

    const transformedData = (data || []).map((bet) => ({
      ...bet,
      week: bet.games?.week || null,
      player: bet.player ? playersMap[bet.player] || null : null,
      terminal: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      tsn: bet.terminal?.serial_number ? bet.terminal.serial_number : undefined,
      same: 0,
      agent: bet.terminal?.agent ? bet.terminal.agent.username : undefined,
      deletedAt: bet.updated_at,
    }));

    const gameIds = Array.from(new Set((data || []).map((bet) => bet.game_id).filter(Boolean)));
    let sportsMatchesMap: Record<string, any[]> = {};

    if (gameIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("sports")
        .select("*")
        .in("game_id", gameIds);

      if (!matchesError && matchesData) {
        sportsMatchesMap = matchesData.reduce((acc, match) => {
          if (!acc[match.game_id]) acc[match.game_id] = [];
          acc[match.game_id].push(match);
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    const matchesMap = transformedData.reduce((acc, bet) => {
      acc[bet.game_id] = sportsMatchesMap[bet.game_id] || [];
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ data: transformedData, matches: matchesMap });
  } catch (error) {
    console.error("Error fetching sports draw void bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch deleted bets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServer();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Bet ID is required" },
        { status: 400 }
      );
    }

    const { data: existingBet, error: fetchError } = await supabase
      .from("bets_sports_draw")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching bet:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch bet" },
        { status: 500 }
      );
    }

    if (!existingBet) {
      return NextResponse.json(
        { error: "Bet not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("bets_sports_draw")
      .update({ status: "void", award: existingBet.staked })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error deleting bet:", error);
      return NextResponse.json(
        { error: "Failed to delete bet" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bet deleted successfully",
      data: data,
    });
  } catch (error) {
    console.error("Error deleting bet:", error);
    return NextResponse.json(
      { error: "Failed to delete bet" },
      { status: 500 }
    );
  }
}
