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

    const { data, error } = await supabase
      .from("bets_sport")
      .select("*, games:game_id (week, id), terminal:terminal(serial_number)")
      .eq("games.week", parseInt(week))
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

    const gameIds = Array.from(new Set(data.map((bet) => bet.games?.id).filter(Boolean)));
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
        player: bet.player ? playersMap[bet.player] || null : null,
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
