import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("bets_sports_draw")
      .select("*, games:game_id (week), terminal:terminal(serial_number, agent:agent_id(username))")
      .eq("status", "void")
      .order("updated_at", { ascending: false });

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

    return NextResponse.json({ data: transformedData, matches: {} });
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
      .from("bets_sports_draw")
      .update({ status: "void", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;

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
    console.error("Error voiding sports draw bet:", error);
    return NextResponse.json(
      { error: "Failed to void bet" },
      { status: 500 }
    );
  }
}
