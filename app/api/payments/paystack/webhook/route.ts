import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, fromKobo } from '@/lib/payments/paystack';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse the JSON payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const data = payload.data;

    console.log('Paystack webhook event:', event);

    // Handle different event types
    switch (event) {
      case 'charge.success':
        await handleChargeSuccess(data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(data);
        break;

      case 'transfer.reversed':
        await handleTransferReversed(data);
        break;

      default:
        console.log('Unhandled event type:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const supabase = await createSupabaseServer();
    const amount = fromKobo(data.amount);
    const reference = data.reference;

    // Look up user by reference in transactions table
    const { data: existingTx, error: txError } = await supabase
      .from('transactions')
      .select('user_id, profile_id, status')
      .eq('reference', reference)
      .single();

    if (txError || !existingTx) {
      console.error('Transaction not found in webhook:', txError);
      return;
    }

    // Check if already processed
    if (existingTx.status === 'completed') {
      console.log('Transaction already processed:', reference);
      return;
    }

    const userId = existingTx.user_id;

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      console.error('User profile not found in webhook:', userError);
      return;
    }

    // Update user balance
    const newBalance = (userData.balance || 0) + amount;
    await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    // Update transaction status to completed
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        payment_channel: data.channel,
        metadata: {
          gateway_response: data.gateway_response,
          paid_at: data.paid_at,
          customer: data.customer,
        },
      })
      .eq('reference', reference);

    console.log('Deposit processed via webhook:', reference);
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleTransferSuccess(data: any) {
  try {
    const supabase = await createSupabaseServer();
    const reference = data.reference;

    // Update transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        metadata: data,
      })
      .eq('reference', reference);

    console.log('Transfer completed:', reference);
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
}

async function handleTransferFailed(data: any) {
  try {
    const supabase = await createSupabaseServer();
    const reference = data.reference;
    const amount = fromKobo(data.amount);

    // Get the transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('reference', reference)
      .single();

    if (transaction) {
      // Refund the amount to user balance
      const { data: userData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (userData) {
        await supabase
          .from('profiles')
          .update({ balance: (userData.balance || 0) + amount })
          .eq('user_id', transaction.user_id);
      }

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: data,
        })
        .eq('reference', reference);
    }

    console.log('Transfer failed and refunded:', reference);
  } catch (error) {
    console.error('Error handling transfer failed:', error);
  }
}

async function handleTransferReversed(data: any) {
  try {
    const supabase = await createSupabaseServer();
    const reference = data.reference;
    const amount = fromKobo(data.amount);

    // Get the transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('reference', reference)
      .single();

    if (transaction) {
      // Refund the amount to user balance
      const { data: userData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (userData) {
        await supabase
          .from('profiles')
          .update({ balance: (userData.balance || 0) + amount })
          .eq('user_id', transaction.user_id);
      }

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: 'reversed',
          metadata: data,
        })
        .eq('reference', reference);
    }

    console.log('Transfer reversed and refunded:', reference);
  } catch (error) {
    console.error('Error handling transfer reversed:', error);
  }
}
