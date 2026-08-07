import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildDefaultPoolsMatches } from "@/lib/pools/defaultMatches";
import { syncTerminalsIfPoolsGame } from "@/lib/admin/gamePrizeMutations";
import { normalizeGamePrizeEntries } from "@/lib/admin/syncTerminalPrizesFromGame";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

const SPORTS_DEFAULT_MAX_PRIZE = {
  "1": 2,
  X: 1.6,
  "2": 1.9,
  "1X": 1.1,
  "12": 2.1,
  X2: 3.2,
  "OV 2.5": 3,
  "UN 2.5": 3.5,
  GG: 3.1,
};

const SPORTS_DRAW_DEFAULT_MAX_PRIZE = {
  X: 1.6,
};

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: prizesData, error: prizesError } = await supabase
      .from("prize")
      .select("id, name, status");

    if (prizesError) {
      return NextResponse.json({ error: prizesError.message }, { status: 500 });
    }

    const prizesMap = new Map(
      prizesData?.map((prize) => [prize.id, prize]) || []
    );

    const games = data.map((game) => {
      if (game.type === "sports" || game.type === "sports_draw") {
        return {
          ...game,
          prizes: [], // Sports games don't have traditional prizes
        };
      }
      const prizeIds = game.prize_ids || [];
      const prizes = prizeIds.map((prizeEntry: any) => {
        const prizeId = typeof prizeEntry === "string" ? prizeEntry : prizeEntry.id;
        const prizeDetails = prizesMap.get(prizeId);
        return {
          id: prizeId,
          name: prizeDetails?.name || "Unknown Prize",
          status: prizeEntry.status ?? prizeDetails?.status ?? "active",
        };
      });

      return {
        ...game,
        prizes,
      };
    });

    return NextResponse.json({ games }, { status: 200 });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { week, type, startTime, endTime, results, gameName } = body;

    // Validate required fields
    if (!week || !type || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (type !== "lotto") {
      const now = new Date().toISOString();
      const { data: activeGameData, error: activeGameError } = await supabase
        .from("games")
        .select("id, week, start_time, end_time")
        .eq("type", type)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("start_time", { ascending: false })
        .limit(1);

      if (activeGameError) {
        return NextResponse.json({ error: activeGameError.message }, { status: 500 });
      }

      const activeGame = activeGameData?.[0];
      if (activeGame) {
        return NextResponse.json(
          {
            error: `A ${type} game is already active (week ${activeGame.week}).`,
            activeGame,
          },
          { status: 409 }
        );
      }
    }

    const trimmedGameName =
      type === "lotto" && typeof gameName === "string" ? gameName.trim() : "";

    // Previous game: latest same-type game with an earlier start_time
    let previousGame: {
      week: number;
      max_stake: unknown;
      max_prize: unknown;
      visible_numbers: number[] | null;
      void_window_minutes: number | null;
      prize_ids: unknown;
    } | null = null;

    if (
      type === "lotto" ||
      type === "pools" ||
      type === "sports" ||
      type === "sports_draw"
    ) {
      const { data } = await supabase
        .from("games")
        .select("week, max_stake, max_prize, visible_numbers, void_window_minutes, prize_ids")
        .eq("type", type)
        .lt("start_time", startTime)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      previousGame = data;
    }

    const resolveMaxPrize = () => {
      if (type === "sports") {
        return previousGame?.max_prize ?? SPORTS_DEFAULT_MAX_PRIZE;
      }
      if (type === "sports_draw") {
        return previousGame?.max_prize ?? SPORTS_DRAW_DEFAULT_MAX_PRIZE;
      }
      return null;
    };

    const resolvePrizeIds = () => {
      if (type === "lotto" || type === "pools") {
        const previousPrizes = normalizeGamePrizeEntries(previousGame?.prize_ids);
        return previousPrizes.length > 0 ? previousPrizes : null;
      }

      if (type === "sports" || type === "sports_draw") {
        const prizeIds = previousGame?.prize_ids;
        if (!prizeIds || typeof prizeIds !== "object" || Array.isArray(prizeIds)) {
          return null;
        }
        const previousCommissions = (prizeIds as { commissions?: unknown }).commissions;
        if (!Array.isArray(previousCommissions) || previousCommissions.length === 0) {
          return null;
        }
        // Carry terminal commissions only; do not copy draw-odds maps from prior weeks
        return { commissions: previousCommissions };
      }

      return null;
    };

    const resolvedPrizeIds = resolvePrizeIds();

    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          week,
          type,
          start_time: startTime,
          end_time: endTime,
          results: results || null,
          game_name: trimmedGameName || null,
          max_stake: previousGame?.max_stake ?? null,
          ...(type === "lotto"
            ? { visible_numbers: previousGame?.visible_numbers ?? null }
            : {}),
          max_prize: resolveMaxPrize(),
          prize_ids: resolvedPrizeIds,
          ...(previousGame?.void_window_minutes != null
            ? { void_window_minutes: previousGame.void_window_minutes }
            : {}),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (type === "pools") {
      let latestWeekTemplates: Array<{
        number: number;
        home: string;
        away: string;
        status: "enable" | "disable";
      }> = [];

      if (previousGame) {
        const { data: previousWeekMatches } = await supabase
          .from("matches")
          .select("number, home, away, status")
          .eq("week", previousGame.week)
          .order("number", { ascending: true });

        latestWeekTemplates = (previousWeekMatches || []).map((match) => ({
          number: match.number,
          home: match.home,
          away: match.away,
          status: match.status === "disable" ? "disable" : "enable",
        }));
      }

      const defaultMatches = buildDefaultPoolsMatches(week, latestWeekTemplates);

      const { error: clearMatchesError } = await supabase
        .from("matches")
        .delete()
        .eq("week", week);

      if (clearMatchesError) {
        console.error("Error clearing matches for new pools game:", clearMatchesError);
        await supabase.from("games").delete().eq("id", data.id);
        return NextResponse.json(
          { error: "Failed to prepare default pool matches" },
          { status: 500 }
        );
      }

      const { error: matchInsertError } = await supabase
        .from("matches")
        .insert(defaultMatches);

      if (matchInsertError) {
        console.error("Error seeding matches for new pools game:", matchInsertError);
        await supabase.from("games").delete().eq("id", data.id);
        return NextResponse.json(
          { error: "Failed to create default pool matches" },
          { status: 500 }
        );
      }

      if (resolvedPrizeIds) {
        const { error: syncError } = await syncTerminalsIfPoolsGame(
          supabase,
          type,
          resolvedPrizeIds
        );
        if (syncError) {
          console.error("Error syncing terminal prizes for new pools game:", syncError);
        }
      }
    }

    return NextResponse.json({ game: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
