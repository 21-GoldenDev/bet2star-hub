import { NextRequest, NextResponse } from 'next/server';
import {
  createTransferRecipient,
  initiateTransfer,
  generatePaymentReference,
  toKobo,
} from '@/lib/payments/paystack';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      amount,
      accountNumber,
      bankCode,
      accountName,
      reason,
    } = body;

    // Validate inputs
    if (!userId || !amount || !accountNumber || !bankCode || !accountName) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      );
    }

    if (amount < 100) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Minimum withdrawal amount is ₦100' },
          { status: 400 }
        )
      );
    }

    const supabase = await createSupabaseServer();

    // Get user balance
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has sufficient balance
    if ((userData.balance || 0) < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create transfer recipient
    const recipientResult = await createTransferRecipient({
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
    });

    if (!recipientResult.success) {
      return NextResponse.json(
        { error: recipientResult.error },
        { status: 500 }
      );
    }

    const recipientCode = recipientResult.data.recipient_code;

    // Generate unique reference
    const reference = generatePaymentReference('WTH');

    // Deduct amount from user balance first
    const newBalance = (userData.balance || 0) - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update balance' },
        { status: 500 }
      );
    }

    // Create transaction record (pending)
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount: amount,
      status: 'pending',
      reference: reference,
      payment_method: 'paystack',
      payment_channel: 'bank_transfer',
      metadata: {
        account_number: accountNumber,
        account_name: accountName,
        bank_code: bankCode,
        recipient_code: recipientCode,
      },
    });

    if (txError) {
      // Rollback balance update
      await supabase
        .from('profiles')
        .update({ balance: userData.balance })
        .eq('user_id', userId);

      return addCORSHeaders(
        NextResponse.json(
          { error: 'Failed to create transaction record' },
          { status: 500 }
        )
      );
    }

    // Initiate transfer
    const transferResult = await initiateTransfer({
      source: 'balance',
      amount: toKobo(amount),
      recipient: recipientCode,
      reason: reason || 'Withdrawal from Bet2Star',
      reference: reference,
    });

    if (!transferResult.success) {
      // Update transaction status to failed and refund
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('reference', reference);

      await supabase
        .from('profiles')
        .update({ balance: userData.balance })
        .eq('user_id', userId);

      return addCORSHeaders(
        NextResponse.json(
          { error: transferResult.error },
          { status: 500 }
        )
      );
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        message: 'Withdrawal initiated successfully',
        data: {
          reference: reference,
          amount: amount,
          newBalance: newBalance,
          status: 'pending',
          transferCode: transferResult.data.transfer_code,
        },
      })
    );
  } catch (error: any) {
    console.error('Transfer error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to process withdrawal' },
        { status: 500 }
      )
    );
  }
}
