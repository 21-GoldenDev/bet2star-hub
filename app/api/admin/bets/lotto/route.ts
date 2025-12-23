import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { GameMode } from "@/lib/types/lotto";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const week = searchParams.get("week");
    const gameType = searchParams.get("gameType") as GameMode | "all" | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let query = supabase
      .from("bets_lotto")
      .select("*")
      .order("bet_time", { ascending: false });

    if (week) {
      query = query.eq("week", parseInt(week));
    }

    if (gameType && gameType !== "all") {
      query = query.eq("gameType", gameType);
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

    let playersMap: Record<string, { id: string; fullName: string; email: string }> = {};

    if (uniquePlayerIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

      if (!usersError && usersData?.users) {
        playersMap = usersData.users
          .filter((user) => uniquePlayerIds.includes(user.id))
          .reduce((acc, user) => {
            acc[user.id] = {
              id: user.id,
              fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Unknown",
              email: user.email || "",
            };
            return acc;
          }, {} as Record<string, { id: string; fullName: string; email: string }>);
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
      numbers: bet.numbers,
      staked: bet.staked,
      terminal: bet.terminal,
      betTime: bet.bet_time,
    }));

    return NextResponse.json({ data: transformedData }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Bet ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("bets_lotto")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete bet" },
      { status: 500 }
    );
  }
}
