import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';
import {
  TurboPrize,
  calculateBetReward,
  computeLottoAward,
  computePoolsAward,
} from '@/lib/helpers';
import { getGamePrizeException } from '@/lib/admin/syncTerminalPrizesFromGame';
import { dedupePoolsMatchesByNumber } from '@/lib/pools/defaultMatches';
import { flattenSportsMatchNumbers, validateDrawOnlySelections } from '@/lib/bets/sportsCombinations';
import { Prize } from '@/lib/types/prize';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { betType, gameId, betAmount, betData } = body;

    if (!betType || !gameId || !betAmount || !betData) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Invalid request' },
          { status: 400 }
        )
      );
    }

    if (betAmount <= 0) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Invalid bet amount' },
          { status: 400 }
        )
      );
    }

    const supabase = await createSupabaseServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      );
    }

    if (profile.balance < betAmount) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Insufficient balance. Please deposit funds to continue.' },
          { status: 400 }
        )
      );
    }

    const newBalance = profile.balance - betAmount;
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('user_id', user.id);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Failed to update balance' },
          { status: 500 }
        )
      );
    }

    let betResult;
    try {
      switch (betType) {
        case 'sports':
          betResult = await placeSportsBet(supabase, gameId, user.id, betAmount, betData);
          break;
        case 'sports_draw':
          betResult = await placeSportsDrawBet(supabase, gameId, user.id, betAmount, betData);
          break;
        case 'lotto':
          betResult = await placeLottoBet(supabase, gameId, user.id, betAmount, betData);
          break;
        case 'pools':
          betResult = await placePoolsBet(supabase, gameId, user.id, betAmount, betData);
          break;
        default:
          throw new Error('Invalid bet type');
      }
    } catch (betError: any) {
      await supabase
        .from('profiles')
        .update({ balance: profile.balance })
        .eq('user_id', user.id);

      throw betError;
    }

    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'bet',
      amount: betAmount,
      status: 'completed',
      reference: `BET-${betType.toUpperCase()}-${betResult.betNumber}`,
      payment_method: 'balance',
      metadata: {
        bet_type: betType,
        game_id: gameId,
        bet_id: betResult.betId,
        bet_number: betResult.betNumber,
        bet_data: betData,
      },
    });

    if (txError) {
      console.error('Transaction record error:', txError);
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        message: 'Bet placed successfully',
        data: {
          betId: betResult.betId,
          betNumber: betResult.betNumber,
          newBalance,
          amountStaked: betAmount,
          award: betResult.award || 0,
        },
      })
    );
  } catch (error: any) {
    console.error('Place bet error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to place bet' },
        { status: 500 }
      )
    );
  }
}

async function placeSportsBet(
  supabase: any,
  gameId: string,
  userId: string,
  betAmount: number,
  betData: any,
) {
  const { under, mode } = betData;
  let selections = betData.selections;

  const normalizedMode = typeof mode === 'string' ? mode.toLowerCase() : '';
  const allowedModes = ['direct', 'permutation', 'grouping', 'one_banker'];
  if (!allowedModes.includes(normalizedMode)) {
    throw new Error('Invalid mode. Must be "direct", "permutation", "grouping", or "one_banker"');
  }

  if (normalizedMode === 'grouping') {
    if (!betData.grouping?.selectedUs?.length || !betData.grouping?.groupSelections) {
      throw new Error('Grouping mode requires grouping data');
    }
    selections = betData.grouping.groupSelections;
    if (!Array.isArray(under) || under.length !== 1) {
      throw new Error('For grouping mode, "under" must be an array with a single total-under value');
    }
  } else if (normalizedMode === 'one_banker') {
    if (!selections || typeof selections !== 'object') {
      throw new Error('One banker mode requires selections');
    }
    if (!Array.isArray(under) || under.length !== 1 || under[0] !== 2) {
      throw new Error('For one_banker mode, "under" must be [2]');
    }
  } else if (normalizedMode === 'permutation' && (!Array.isArray(under) || under.length === 0)) {
    throw new Error('For permutation mode, "under" must be a non-empty array');
  } else if (normalizedMode === 'direct' && (!Array.isArray(under) || under.length !== 1)) {
    throw new Error('For direct mode, "under" must be an array with a single value');
  }

  await validateSportsSelectionsAvailability(supabase, gameId, selections);

  const { data: existingBets, error: countError } = await supabase
    .from('bets_sport')
    .select('number')
    .eq('game_id', gameId)
    .order('number', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].number + 1 : 1;

  const { data, error } = await supabase
    .from('bets_sport')
    .insert({
      game_id: gameId,
      number: nextNumber,
      player: userId,
      mode: normalizedMode,
      under: under,
      staked: betAmount,
      bet_time: new Date().toISOString(),
      status: 'active',
      selections,
      award: 0,
    })
    .select()
    .single();

  if (error) throw error;

  const award = await computeSportsAward(
    supabase,
    gameId,
    data,
  );

  if (award > 0) {
    await supabase.from('bets_sport').update({ award }).eq('id', data.id);
  }

  return { betId: data.id, betNumber: nextNumber, award };
}

async function placeSportsDrawBet(
  supabase: any,
  gameId: string,
  userId: string,
  betAmount: number,
  betData: any,
) {
  const { under, mode } = betData;
  let selections = betData.selections;

  const normalizedMode = typeof mode === 'string' ? mode.toLowerCase() : '';
  const allowedModes = ['direct', 'permutation', 'grouping', 'one_banker'];
  if (!allowedModes.includes(normalizedMode)) {
    throw new Error('Invalid mode. Must be "direct", "permutation", "grouping", or "one_banker"');
  }

  if (normalizedMode === 'grouping') {
    if (!betData.grouping?.selectedUs?.length || !betData.grouping?.groupSelections) {
      throw new Error('Grouping mode requires grouping data');
    }
    selections = betData.grouping.groupSelections;
    if (!Array.isArray(under) || under.length !== 1) {
      throw new Error('For grouping mode, "under" must be an array with a single total-under value');
    }
  } else if (normalizedMode === 'one_banker') {
    if (!selections || typeof selections !== 'object') {
      throw new Error('One banker mode requires selections');
    }
    if (!Array.isArray(under) || under.length !== 1 || under[0] !== 2) {
      throw new Error('For one_banker mode, "under" must be [2]');
    }
  } else if (normalizedMode === 'permutation' && (!Array.isArray(under) || under.length === 0)) {
    throw new Error('For permutation mode, "under" must be a non-empty array');
  } else if (normalizedMode === 'direct' && (!Array.isArray(under) || under.length !== 1)) {
    throw new Error('For direct mode, "under" must be an array with a single value');
  }

  if (!selections || typeof selections !== 'object') {
    throw new Error('Invalid selections for sports draw');
  }

  if (!validateDrawOnlySelections(selections)) {
    throw new Error('Sports draw selections must contain only draw (D) options');
  }

  await validateSportsSelectionsAvailability(supabase, gameId, selections);

  const { data: existingBets, error: countError } = await supabase
    .from('bets_sports_draw')
    .select('number')
    .eq('game_id', gameId)
    .order('number', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].number + 1 : 1;

  const { data, error } = await supabase
    .from('bets_sports_draw')
    .insert({
      game_id: gameId,
      number: nextNumber,
      player: userId,
      mode: normalizedMode,
      under: under,
      staked: betAmount,
      bet_time: new Date().toISOString(),
      status: 'active',
      selections,
      award: 0,
    })
    .select()
    .single();

  if (error) throw error;

  const award = await computeSportsAward(
    supabase,
    gameId,
    data,
    true
  );

  if (award > 0) {
    await supabase.from('bets_sports_draw').update({ award }).eq('id', data.id);
  }

  return { betId: data.id, betNumber: nextNumber, award };
}

async function validateSportsSelectionsAvailability(
  supabase: any,
  gameId: string,
  selections: Record<string, unknown>,
) {
  if (!selections || typeof selections !== 'object') {
    throw new Error('Invalid selections');
  }

  const selectedNumbers = flattenSportsMatchNumbers(selections as any);

  if (selectedNumbers.length === 0) {
    throw new Error('No matches selected');
  }

  const { data: selectedMatches, error: selectedMatchesError } = await supabase
    .from('sports')
    .select('number, status, end_time, processed')
    .eq('game_id', gameId)
    .in('number', selectedNumbers);

  if (selectedMatchesError) throw selectedMatchesError;

  if (!selectedMatches || selectedMatches.length !== selectedNumbers.length) {
    throw new Error('One or more selected matches are unavailable');
  }

  const now = Date.now();
  for (const match of selectedMatches) {
    if (match.status === 'void') {
      throw new Error(`Match ${match.number} is inactive`);
    }

    if (Boolean(match.processed)) {
      throw new Error(`Match ${match.number} has been processed`);
    }

    if (match.end_time) {
      const end = new Date(match.end_time).getTime();
      if (Number.isFinite(end) && end <= now) {
        throw new Error(`Match ${match.number} has expired and can no longer be played`);
      }
    }
  }
}

async function placeLottoBet(supabase: any, gameId: string, userId: string, betAmount: number, betData: any) {
  const { selectedNumbers, matchAtLeast, gameMode, prize } = betData;

  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('visible_numbers')
    .eq('id', gameId)
    .single();

  if (gameError) throw gameError;

  const visibleNumbers: number[] = gameData?.visible_numbers || Array.from({ length: 99 }, (_, i) => i + 1);


  const { data: existingBets, error: countError } = await supabase
    .from('bets_lotto')
    .select('bet_id')
    .eq('game_id', gameId)
    .order('bet_id', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].bet_id + 1 : 1;

  let numbersObj: Record<string, number[]> | number[];

  if (gameMode === "nap_perm" || gameMode === "turbo") {
    numbersObj = selectedNumbers;
  } else if (gameMode === "grouping") {
    const { selectedUs, groupSelections } = betData.grouping;
    numbersObj = {};
    selectedUs.forEach((sel: { id: string; u: number }) => {
      const nums = groupSelections[sel.id] || [];
      (numbersObj as Record<string, number[]>)[`${sel.u}-${sel.id}`] = nums;
    });
  } else if (gameMode === "two_banker") {
    const { groupAU, groupANumbers, totalUnder } = betData.twobanker;
    const groupBU = totalUnder - groupAU;
    const groupBNumbers = visibleNumbers.filter((n) => !groupANumbers.includes(n));
    numbersObj = {
      [`${groupAU}-groupA`]: groupANumbers,
      [`${groupBU}-groupB`]: groupBNumbers,
    };
  } else if (gameMode === "one_banker") {
    const { groupANumbers } = betData.onebanker;
    const groupBNumbers = visibleNumbers.filter((n) => !groupANumbers.includes(n));
    numbersObj = {
      [`1-groupA`]: groupANumbers,
      [`1-groupB`]: groupBNumbers,
    };
  } else {
    numbersObj = selectedNumbers;
  }

  const { data, error } = await supabase
    .from('bets_lotto')
    .insert({
      game_id: gameId,
      bet_id: nextNumber,
      player: userId,
      numbers: numbersObj,
      gameType: gameMode,
      under: matchAtLeast || [],
      staked: betAmount,
      bet_time: new Date().toISOString(),
      prize_id: prize,
      award: 0,
    })
    .select()
    .single();

  if (error) throw error;

  const award = await computeLottoAwardForBet(supabase, gameId, data, prize);

  if (award > 0) {
    await supabase.from('bets_lotto').update({ award }).eq('id', data.id);
  }

  return { betId: data.id, betNumber: nextNumber, award };
}

async function placePoolsBet(supabase: any, gameId: string, userId: string, betAmount: number, betData: any) {
  const { selectedMatches, matchAtLeast, gameMode, prize } = betData;

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select("week")
    .eq("id", gameId)
    .single();

  if (gameError) throw gameError;

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "enable")
    .eq("week", gameData.week)
    .order("number", { ascending: true });

  if (matchError) throw matchError;

  const visibleMatches: string[] =
    dedupePoolsMatchesByNumber(matchData || []).map((match) => String(match.number))
    || Array.from({ length: 49 }, (_, i) => String(i + 1));

  const { data: existingBets, error: countError } = await supabase
    .from('bets_pools')
    .select('bet_id')
    .eq('game_id', gameId)
    .order('bet_id', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].bet_id + 1 : 1;

  let matchesObj: Record<string, string[]> | string[];

  if (gameMode === "nap_perm" || gameMode === "turbo") {
    matchesObj = selectedMatches;
  } else if (gameMode === "grouping") {
    const { selectedUs, groupSelections } = betData.grouping;
    matchesObj = {};
    selectedUs.forEach((sel: { id: string; u: number }) => {
      const matches = groupSelections[sel.id] || [];
      (matchesObj as Record<string, string[]>)[`${sel.u}-${sel.id}`] = matches;
    });
  } else if (gameMode === "two_banker") {
    const { groupAU, groupAMatches, totalUnder } = betData.twobanker;
    const groupBU = totalUnder - groupAU;
    const groupBMatches = visibleMatches.filter((n) => !groupAMatches.includes(n));
    matchesObj = {
      [`${groupAU}-groupA`]: groupAMatches,
      [`${groupBU}-groupB`]: groupBMatches,
    };
  } else if (gameMode === "one_banker") {
    const { groupAMatches } = betData.onebanker;
    const groupBMatches = visibleMatches.filter((n) => !groupAMatches.includes(n));
    matchesObj = {
      [`1-groupA`]: groupAMatches,
      [`1-groupB`]: groupBMatches,
    };
  } else {
    matchesObj = selectedMatches;
  }

  const { data, error } = await supabase
    .from('bets_pools')
    .insert({
      game_id: gameId,
      bet_id: nextNumber,
      player: userId,
      matches: matchesObj,
      gameType: gameMode,
      under: matchAtLeast || [],
      staked: betAmount,
      bet_time: new Date().toISOString(),
      prize_id: prize,
      award: 0,
    })
    .select()
    .single();

  if (error) throw error;

  const award = await computePoolsAwardForBet(supabase, gameId, data, prize);

  if (award > 0) {
    await supabase.from('bets_pools').update({ award }).eq('id', data.id);
  }

  return { betId: data.id, betNumber: nextNumber, award };
}

async function computeSportsAward(
  supabase: any,
  gameId: string,
  bet: any,
  drawMode: boolean = false,
): Promise<number> {
  try {
    const { data: matches, error } = await supabase
      .from('sports')
      .select('*')
      .eq('game_id', gameId);

    if (error) {
      console.error('Sports award fetch error:', error);
      return 0;
    }

    const selections = bet?.selections || {};
    const matchNumbers = flattenSportsMatchNumbers(selections);
    if (matchNumbers.length === 0) return 0;

    const matchesWithScores = matches.filter((m: any) =>
      Number.isFinite(m.home_goal) && Number.isFinite(m.away_goal)
    );

    const allSelectedHaveScores = matchNumbers.every((num) =>
      matchesWithScores.some((m: any) => m.number === num)
    );

    if (!allSelectedHaveScores) return 0;

    return calculateBetReward(bet, matchesWithScores, drawMode) || 0;
  } catch (err) {
    console.error('Sports award calc error:', err);
    return 0;
  }
}

async function computeLottoAwardForBet(
  supabase: any,
  gameId: string,
  bet: any,
  prizeId?: string,
): Promise<number> {
  try {
    const [resultResp, prizeResp, turboResp] = await Promise.all([
      supabase.from('games').select('results').eq('id', gameId).single(),
      loadPrize(supabase, prizeId),
      loadTurboPrize(supabase),
    ]);

    if (resultResp.error) {
      console.error('Lotto result fetch error:', resultResp.error);
      return 0;
    }

    const results = (resultResp.data?.results as number[]) || [];
    if (!Array.isArray(results) || results.length === 0) return 0;

    const award = computeLottoAward(bet, prizeResp, results, turboResp);
    return Number.isFinite(award) ? award : 0;
  } catch (err) {
    console.error('Lotto award calc error:', err);
    return 0;
  }
}

async function computePoolsAwardForBet(
  supabase: any,
  gameId: string,
  bet: any,
  prizeId?: string,
): Promise<number> {
  try {
    const [resultResp, prizeResp, turboResp] = await Promise.all([
      supabase.from('games').select('results, prize_ids').eq('id', gameId).single(),
      loadPrize(supabase, prizeId),
      loadTurboPrize(supabase),
    ]);

    if (resultResp.error) {
      console.error('Pools result fetch error:', resultResp.error);
      return 0;
    }

    const results = (resultResp.data?.results as string[]) || [];
    if (!Array.isArray(results) || results.length === 0) return 0;

    const resultException = prizeId
      ? getGamePrizeException(resultResp.data?.prize_ids, prizeId)
      : undefined;
    const award = computePoolsAward(bet, prizeResp, results, turboResp, resultException);
    return Number.isFinite(award) ? award : 0;
  } catch (err) {
    console.error('Pools award calc error:', err);
    return 0;
  }
}

async function loadPrize(supabase: any, prizeId?: string): Promise<Prize | null> {
  if (!prizeId) return null;
  const { data: prize, error: prizeError } = await supabase.from('prize').select('id, name, data').eq('id', prizeId).single();

  if (prizeError) {
    console.error('Prize fetch error:', prizeError);
    return null;
  }

  if (!prize) return null;

  return prize as Prize;
}

async function loadTurboPrize(supabase: any): Promise<TurboPrize | null> {
  const { data, error } = await supabase.from('turbo_prize').select('*').single();
  if (error) {
    console.error('Turbo prize fetch error:', error);
    return null;
  }
  return data as TurboPrize;
}
