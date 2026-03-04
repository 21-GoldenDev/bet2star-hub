import { createSupabaseServer } from "@/lib/supabase/server";
import { Prize } from "@/lib/types/prize";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("bets_pools")
      .select("*, games:game_id (week), terminal:terminal(serial_number, agent:agent_id(username))")
      .eq("status", "void")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    // Transform data to match frontend types (camelCase)
    const transformedData = data.map((bet) => ({
      id: bet.id,
      gameId: bet.game_id,
      gameType: bet.gameType,
      betId: bet.bet_id,
      week: bet.games?.week ?? null,
      player: bet.player ? playersMap[bet.player] : undefined,
      under: bet.under,
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
      deletedAt: bet.updated_at,
    }));

    return NextResponse.json({ data: transformedData }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Bet ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bets_pools")
      .update({ status: "void", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Bet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bet voided successfully",
      data: data[0],
    });
  } catch (error) {
    console.error("Error voiding bet:", error);
    return NextResponse.json(
      { error: "Failed to void bet" },
      { status: 500 }
    );
  }
}
