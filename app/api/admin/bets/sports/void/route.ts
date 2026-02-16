import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("bets_sport")
      .select("*, games:game_id (week, id), terminal:terminal(serial_number)")
      .eq("status", "void")
      .order("updated_at", { ascending: false });

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
        player: bet.player ? playersMap[bet.player] || null : null,
        deletedAt: bet.updated_at,
      };
    });

    return NextResponse.json({ data: transformedData || [], matches: matchesMap });
  } catch (error) {
    console.error("Error fetching deleted bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch deleted bets" },
      { status: 500 }
    );
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
      .from("bets_sport")
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
