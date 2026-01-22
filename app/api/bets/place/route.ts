import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

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

async function placeSportsBet(supabase: any, gameId: string, userId: string, betAmount: number, betData: any) {
  const { selections, under, mode } = betData;

  const normalizedMode = typeof mode === 'string' ? mode.toLowerCase() : '';
  if (!['direct', 'permutation'].includes(normalizedMode)) {
    throw new Error('Invalid mode. Must be "direct" or "permutation"');
  }

  if (mode === 'permutation' && (!Array.isArray(under) || under.length === 0)) {
    throw new Error('For permutation mode, "under" must be a non-empty array');
  }

  if (mode === 'direct' && (!Array.isArray(under) || under.length !== 1)) {
    throw new Error('For direct mode, "under" must be an array with a single value');
  }

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
      terminal: '',
      bet_time: new Date().toISOString(),
      status: 'active',
      selections,
    })
    .select()
    .single();

  if (error) throw error;

  return { betId: data.id, betNumber: nextNumber };
}

async function placeLottoBet(supabase: any, gameId: string, userId: string, betAmount: number, betData: any) {
  const { selectedNumbers, matchAtLeast, gameMode, prize } = betData;

  const { data: existingBets, error: countError } = await supabase
    .from('bets_lotto')
    .select('bet_id')
    .eq('game_id', gameId)
    .order('bet_id', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].bet_id + 1 : 1;

  const { data, error } = await supabase
    .from('bets_lotto')
    .insert({
      game_id: gameId,
      bet_id: nextNumber,
      player: userId,
      numbers: selectedNumbers,
      gameType: gameMode,
      under: matchAtLeast,
      staked: betAmount,
      terminal: '',
      bet_time: new Date().toISOString(),
      prize_id: prize,
    })
    .select()
    .single();

  if (error) throw error;

  return { betId: data.id, betNumber: nextNumber };
}

async function placePoolsBet(supabase: any, gameId: string, userId: string, betAmount: number, betData: any) {
  const { selectedMatches, matchAtLeast, gameMode, prize } = betData;

  const { data: existingBets, error: countError } = await supabase
    .from('bets_pools')
    .select('bet_id')
    .eq('game_id', gameId)
    .order('bet_id', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const nextNumber = existingBets && existingBets.length > 0 ? existingBets[0].bet_id + 1 : 1;

  const { data, error } = await supabase
    .from('bets_pools')
    .insert({
      game_id: gameId,
      bet_id: nextNumber,
      player: userId,
      matches: selectedMatches,
      gameType: gameMode,
      under: matchAtLeast,
      staked: betAmount,
      terminal: '',
      bet_time: new Date().toISOString(),
      prize_id: prize,
    })
    .select()
    .single();

  if (error) throw error;

  return { betId: data.id, betNumber: nextNumber };
}
