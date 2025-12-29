import { createSupabaseServer } from "@/lib/supabase/server";
import { GameModeType } from "@/lib/types/gameMode";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const searchParams = request.nextUrl.searchParams;

    const week = searchParams.get("week");
    const gameType = searchParams.get("gameType") as GameModeType | "all" | null;
    const prize = searchParams.get("prize");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let query = supabase
      .from("bets_pools")
      .select("*")
      .order("bet_time", { ascending: false });

    if (week) {
      query = query.eq("week", parseInt(week));
    }

    if (gameType && gameType !== "all") {
      query = query.eq("gameType", gameType);
    }

    if (prize && prize !== "all") {
      query = query.eq("prize", prize);
    }

    if (dateFrom) {
      query = query.gte("bet_time", dateFrom);
    }

    if (dateTo) {
      query = query.lte("bet_time", dateTo);
    }

    const { data, error } = await query;

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

    // Transform data to match frontend types (camelCase)
    const transformedData = data.map((bet) => ({
      id: bet.id,
      gameId: bet.game_id,
      gameType: bet.gameType,
      betId: bet.bet_id,
      week: bet.week,
      player: bet.player ? playersMap[bet.player] : undefined,
      under: bet.under,
      matches: bet.matches,
      staked: bet.staked,
      terminal: bet.terminal,
      betTime: bet.bet_time,
      prize: bet.prize,
      status: bet.status,
    }));

    return NextResponse.json({ data: transformedData }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
