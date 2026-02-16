import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface TotalResult {
  sales: Record<string, number>;
  agentPayable: number;
  onlinePayable: number;
  win: Record<string, number>;
  agentWin: number;
  onlineWin: number;
}

interface OnlineResult {
  sales: Record<string, number>;
  win: Record<string, number>;
}

const defaultSales = {
  agent: 0,
  online: 0,
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const searchParams = request.nextUrl.searchParams;

    const game_id = searchParams.get("game_id");

    if (!game_id) {
      return NextResponse.json({ error: "game_id parameter is required" }, { status: 400 });
    }

    // Fetch game for validation (if needed)
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("prize_ids")
      .eq("id", game_id)
      .single();

    if (gameError) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets_sport")
      .select("*")
      .eq("game_id", game_id);

    if (betsError) {
      console.error("Error fetching bets:", betsError);
      return NextResponse.json({ error: "Failed to fetch bets" }, { status: 500 });
    }

    if (!bets || bets.length === 0) {
      return NextResponse.json({
        totalResult: {
          sales: { ...defaultSales },
          agentPayable: 0,
          onlinePayable: 0,
          win: { ...defaultSales },
          agentWin: 0,
          onlineWin: 0,
        },
        onlineResult: {
          sales: { ...defaultSales },
          win: { ...defaultSales },
        },
        terminalResults: [],
      });
    }

    const gameCommissions = game.prize_ids?.commissions || [];

    const terminalIds = Array.from(new Set(bets.map(b => b.terminal).filter(Boolean)));
    let terminalsData: Record<string, any> = {};

    if (terminalIds.length > 0) {
      const { data: terminals, error: terminalsError } = await supabase
        .from("terminal")
        .select("id, serial_number, agent_id, prizes, agent:agent_id(username, staff_id, staff:staff_id(username))")
        .in("id", terminalIds);

      if (terminalsError) {
        console.error("Error fetching terminals:", terminalsError);
        return NextResponse.json({ error: "Failed to fetch terminal data" }, { status: 500 });
      }

      if (terminals) {
        terminalsData = terminals.reduce((acc, t) => {
          acc[t.id] = t;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    const totalResult: TotalResult = {
      sales: { ...defaultSales },
      agentPayable: 0,
      onlinePayable: 0,
      win: { ...defaultSales },
      agentWin: 0,
      onlineWin: 0,
    };

    const onlineResult: OnlineResult = { sales: { ...defaultSales }, win: { ...defaultSales } };

    const terminalMap: Record<string, any> = {};

    for (const bet of bets) {
      const staked = bet.staked || 0;
      const award = bet.award || 0;
      const isOnline = !bet.terminal;
      const gameType = isOnline ? "online" : "agent";

      if (totalResult.sales.hasOwnProperty(gameType)) {
        totalResult.sales[gameType] += staked;
        totalResult.win[gameType] += award;
      }

      if (isOnline) {
        totalResult.onlinePayable += staked;
        totalResult.onlineWin += award;

        onlineResult.sales[gameType] += staked;
        onlineResult.win[gameType] += award;
      } else {
        let commission = 100;
        if (bet.terminal && terminalsData[bet.terminal]) {
          const terminalData = terminalsData[bet.terminal];
          const staffName = terminalData.agent?.staff?.username || "Unknown Staff";
          const agentName = terminalData.agent?.username || "Unknown Agent";
          const terminalName = terminalData.serial_number || "Unknown Terminal";
          const maxUnder = Math.max(...(bet.under || []), 0);
          const realMaxUnder = Math.min(maxUnder, 18);
          const key = `${staffName}|${agentName}|${terminalName}`;
          const prizeName = `Under ${realMaxUnder === 18 ? "18+" : realMaxUnder}`;

          if (!terminalMap[key]) {
            terminalMap[key] = {
              staff: staffName,
              agent: agentName,
              terminal: terminalName,
              sales: [],
              win: [],
            };
          }

          const existingSale = terminalMap[key].sales.find(
            (s: any) => s.prize.name === prizeName
          );

          const commissionEntry = gameCommissions.find((c: any) => c.terminal === `Under ${realMaxUnder}`);
          if (commissionEntry) {
            commission = commissionEntry.commission;
          }

          if (existingSale) {
            existingSale.amount += staked;
          } else {
            terminalMap[key].sales.push({
              prize: {
                name: prizeName,
                commission: commission,
              },
              amount: staked,
            });
          }

          const existingWin = terminalMap[key].win.find(
            (w: any) => w.prize === prizeName
          );

          if (existingWin) {
            existingWin.amount += award;
          } else {
            terminalMap[key].win.push({
              prize: prizeName,
              amount: award,
            });
          }
        }
        totalResult.agentPayable += staked * (commission / 100);
        totalResult.agentWin += award;
      }
    }

    const terminalResults = Object.values(terminalMap);

    return NextResponse.json({
      totalResult,
      onlineResult,
      terminalResults,
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}
