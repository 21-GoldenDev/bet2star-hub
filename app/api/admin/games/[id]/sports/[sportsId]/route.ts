import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateBetReward } from "@/lib/helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

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

    const prizes = Array.isArray(match?.prizes) ? [...match.prizes] : [0, 0, 0, 0, 0, 0, 0, 0, 0];
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
      .select("id, type, week, start_time, end_time")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.type === "sports_draw") {
      return NextResponse.json(
        { error: "Sports Draw matches are imported from Sports and cannot be edited here" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { league, number, home, away, home_goal, away_goal, prizes, status, start_time, end_time } = body ?? {};

    const updateData: Record<string, any> = {};
    if (league !== undefined) updateData.league = league;
    if (number !== undefined) updateData.number = number;
    if (home !== undefined) updateData.home = home;
    if (away !== undefined) updateData.away = away;
    if (home_goal !== undefined) updateData.home_goal = home_goal;
    if (away_goal !== undefined) updateData.away_goal = away_goal;
    if (prizes !== undefined) {
      updateData.prizes = Array.isArray(prizes) && prizes.length === 9
        ? prizes
        : [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    if (status !== undefined) {
      updateData.status = status === "void" ? "void" : "active";
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

        const { data: betsData, error: betsError } = await supabase
          .from("bets_sport")
          .select("*")
          .eq("game_id", id)
          .neq("status", "deleted");

        if (betsError) {
          console.error("Error fetching bets_sport for award recompute:", betsError.message);
        } else if (betsData && betsData.length > 0) {
          for (const bet of betsData) {
            let award = 0;
            if (bet.status === "void") {
              award = bet.staked || 0;
            } else {
              award = calculateBetReward(bet, matches) || 0;
            }

            const { error: updateBetError } = await supabase
              .from("bets_sport")
              .update({ award })
              .eq("id", bet.id);

            if (updateBetError) {
              console.error(`Error updating award for bet ${bet.id}:`, updateBetError.message);
            }
          }
        }

        if (Number.isFinite(game.week)) {
          const { data: linkedDrawGames, error: linkedGamesError } = await supabase
            .from("games")
            .select("id, prize_ids")
            .eq("type", "sports_draw")
            .eq("week", game.week);

          if (linkedGamesError) {
            console.error("Error fetching linked sports_draw games:", linkedGamesError.message);
          } else if (linkedDrawGames && linkedDrawGames.length > 0) {
            for (const drawGame of linkedDrawGames) {
              const drawOddsMap = extractSportsDrawOddsMap((drawGame as any).prize_ids);
              const drawMatches = applySportsDrawOdds(matches, drawOddsMap);

              const { data: drawBets, error: drawBetsError } = await supabase
                .from("bets_sports_draw")
                .select("*")
                .eq("game_id", drawGame.id)
                .neq("status", "deleted");

              if (drawBetsError) {
                console.error(`Error fetching sports_draw bets for game ${drawGame.id}:`, drawBetsError.message);
                continue;
              }

              for (const bet of drawBets || []) {
                let award = 0;
                if (bet.status === "void") {
                  award = bet.staked || 0;
                } else {
                  award = calculateBetReward(bet, drawMatches) || 0;
                }

                const { error: updateDrawBetError } = await supabase
                  .from("bets_sports_draw")
                  .update({ award })
                  .eq("id", bet.id);

                if (updateDrawBetError) {
                  console.error(`Error updating award for sports_draw bet ${bet.id}:`, updateDrawBetError.message);
                }
              }
            }
          }
        }
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

    if (game.type === "sports_draw") {
      return NextResponse.json(
        { error: "Sports Draw matches are imported from Sports and cannot be deleted here" },
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
