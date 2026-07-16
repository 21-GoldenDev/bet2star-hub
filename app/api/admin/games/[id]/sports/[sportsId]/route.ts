import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateBetReward } from "@/lib/helpers";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

const SPORTS_MAX_PRIZE_KEYS = ["1", "X", "2", "1X", "12", "X2", "OV 2.5", "UN 2.5", "GG"] as const;

const SPORTS_DEFAULT_MAX_PRIZE: Record<string, number> = {
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

const SPORTS_DRAW_DEFAULT_MAX_PRIZE: Record<string, number> = {
  X: 1.6,
};

const SPORTS_PRIZE_LABELS = ["1", "X", "2", "1X", "12", "X2", "Over 2.5", "Under 2.5", "GG"];

function extractSportsDrawOddsMap(prizeIds: any): Record<number, number> {
  if (!prizeIds || typeof prizeIds !== "object" || Array.isArray(prizeIds)) return {};
  const entries = Array.isArray(prizeIds.draw_odds) ? prizeIds.draw_odds : [];
  return entries.reduce((acc: Record<number, number>, item: any) => {
    const matchNumber = Number(item?.match_number);
    const odd = Number(item?.odd);
    if (Number.isFinite(matchNumber) && matchNumber > 0 && Number.isFinite(odd) && odd >= 0) {
      acc[matchNumber] = odd;
    }
    return acc;
  }, {});
}

function applySportsDrawOdds(matches: any[], oddsMap: Record<number, number>): any[] {
  if (!oddsMap || Object.keys(oddsMap).length === 0) return matches;
  return (matches || []).map((match: any) => {
    const matchNumber = Number(match?.number);
    const drawOdd = oddsMap[matchNumber];
    if (!Number.isFinite(drawOdd) || drawOdd < 0) return match;

    const prizes = Array.isArray(match?.prizes) ? [...match.prizes] : [1];
    prizes[0] = drawOdd;
    prizes[1] = drawOdd;
    return { ...match, prizes };
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sportsId: string }> }
) {
  try {
    const { id, sportsId } = await params;
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, type, week, start_time, end_time, prize_ids, max_prize")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Now sports_draw games can manage their own matches
    if (game.type !== "sports" && game.type !== "sports_draw") {
      return NextResponse.json(
        { error: "This game type does not support match management" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { league_id, number, home, away, home_goal, away_goal, prizes, status, processed, start_time, end_time } = body ?? {};

    const activatingMatch = status !== undefined && status !== "void";

    const updateData: Record<string, any> = {};
    if (league_id !== undefined) {
      const { data: leagueData, error: leagueError } = await supabase
        .from("sports_leagues")
        .select("id, name")
        .eq("id", league_id)
        .single();

      if (leagueError || !leagueData) {
        return NextResponse.json({ error: "Invalid league selected" }, { status: 400 });
      }

      updateData.league_id = leagueData.id;
      updateData.league = leagueData.name;
    }
    if (number !== undefined) updateData.number = number;
    if (home !== undefined) updateData.home = home;
    if (away !== undefined) updateData.away = away;
    if (home_goal !== undefined) updateData.home_goal = home_goal;
    if (away_goal !== undefined) updateData.away_goal = away_goal;
    const submittedPrizes = prizes !== undefined
      ? (Array.isArray(prizes) && prizes.length > 0 ? prizes : [1, 1, 1, 1, 1, 1, 1, 1, 1])
      : null;

    if (submittedPrizes !== null) {

      const maxPrizeConfig = game.max_prize && typeof game.max_prize === "object" && !Array.isArray(game.max_prize)
        ? game.max_prize
        : {};

      if (game.type === "sports") {
        for (let i = 0; i < submittedPrizes.length && i < SPORTS_MAX_PRIZE_KEYS.length; i++) {
          const prizeValue = Number(submittedPrizes[i]);
          if (!Number.isFinite(prizeValue)) continue;

          const key = SPORTS_MAX_PRIZE_KEYS[i];
          const configuredLimit = Number(maxPrizeConfig[key]);
          const limit = Number.isFinite(configuredLimit) && configuredLimit > 1
            ? configuredLimit
            : SPORTS_DEFAULT_MAX_PRIZE[key];

          if (prizeValue > limit) {
            return NextResponse.json(
              { error: `Prize for ${key} cannot be greater than max_prize (${limit})` },
              { status: 400 }
            );
          }
        }
      } else {
        const configuredDrawLimit = Number(maxPrizeConfig.X);
        const drawLimit = Number.isFinite(configuredDrawLimit) && configuredDrawLimit > 1
          ? configuredDrawLimit
          : SPORTS_DRAW_DEFAULT_MAX_PRIZE.X;

        for (const value of submittedPrizes) {
          const prizeValue = Number(value);
          if (!Number.isFinite(prizeValue)) continue;

          if (prizeValue > drawLimit) {
            return NextResponse.json(
              { error: `Prize for X cannot be greater than max_prize (${drawLimit})` },
              { status: 400 }
            );
          }
        }
      }

      updateData.prizes = submittedPrizes;
    }

    if (activatingMatch) {
      const { data: existingMatch, error: existingMatchError } = await supabase
        .from("sports")
        .select("prizes")
        .eq("id", sportsId)
        .eq("game_id", id)
        .single();

      if (existingMatchError || !existingMatch) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }

      const activePrizes = submittedPrizes ?? (Array.isArray(existingMatch.prizes) ? existingMatch.prizes : []);
      const invalidIndex = activePrizes.findIndex((value: any) => !Number.isFinite(Number(value)) || Number(value) <= 1);
      if (invalidIndex >= 0) {
        const label = game.type === "sports_draw" ? "X" : (SPORTS_PRIZE_LABELS[invalidIndex] ?? `#${invalidIndex + 1}`);
        return NextResponse.json(
          { error: `Please enter ${label} prize accurately. It must be greater than 1.0.` },
          { status: 400 }
        );
      }
    }

    if (status !== undefined) {
      updateData.status = status === "void" ? "void" : "active";
    }
    if (processed !== undefined) {
      updateData.processed = Boolean(processed);
    }
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;

    const { data, error } = await supabase
      .from("sports")
      .update(updateData)
      .eq("id", sportsId)
      .eq("game_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from("sports")
        .select("*")
        .eq("game_id", id);

      if (matchesError) {
        console.error("Error fetching matches for award recompute:", matchesError.message);
      } else {
        const matches = matchesData || [];

        // Determine the correct bet table based on game type
        const betTable = game.type === "sports_draw" ? "bets_sports_draw" : "bets_sport";

        const { data: betsData, error: betsError } = await supabase
          .from(betTable)
          .select("*")
          .eq("game_id", id)
          .neq("status", "deleted");

        if (betsError) {
          console.error(`Error fetching ${betTable} for award recompute:`, betsError.message);
        } else if (betsData && betsData.length > 0) {
          // For sports_draw, keep match prizes as-is and evaluate using drawMode=true.
          const finalMatches = game.type === "sports_draw"
            ? applySportsDrawOdds(matches, extractSportsDrawOddsMap(game.prize_ids))
            : matches;

          const maxWinAmount = await readMaxWinAmount(supabase);
          const isDraw = game.type === "sports_draw";

          for (const bet of betsData) {
            let award = 0;
            if (bet.status === "void") {
              award = bet.staked || 0;
            } else {
              award = calculateBetReward(bet, finalMatches, isDraw, maxWinAmount) || 0;
            }

            const { error: updateBetError } = await supabase
              .from(betTable)
              .update({ award })
              .eq("id", bet.id);

            if (updateBetError) {
              console.error(`Error updating award for bet ${bet.id}:`, updateBetError.message);
            }
          }
        }

        // Note: Removed the logic for updating linked sports_draw games by week
        // as sports_draw games now manage their own matches independently
      }
    } catch (awardError) {
      console.error("Unexpected error during sports awards recompute:", awardError);
    }

    return NextResponse.json({ match: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sportsId: string }> }
) {
  try {
    const { id, sportsId } = await params;
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("type")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Now sports_draw games can manage their own matches
    if (game.type !== "sports" && game.type !== "sports_draw") {
      return NextResponse.json(
        { error: "This game type does not support match management" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sports")
      .delete()
      .eq("id", sportsId)
      .eq("game_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Match deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting sports match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
