import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, fromKobo } from '@/lib/payments/paystack';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');

    if (!reference) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Payment reference is required' },
          { status: 400 }
        )
      );
    }

    const verification = await verifyPayment(reference);

    if (!verification.status) {
      return NextResponse.json(
        { error: verification.message },
        { status: 400 }
      );
    }

    const paymentData = verification.data;

    if (paymentData.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: paymentData.status,
        message: paymentData.gateway_response,
      });
    }

    const supabase = await createSupabaseServer();
    const amount = fromKobo(paymentData.amount);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return addCORSHeaders(
        NextResponse.json({
          success: true,
          status: 'pending',
          message: 'Payment successful but balance update pending. Please contact support.',
          data: paymentData,
        })
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, balance, user_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User profile not found:', userError);
      return addCORSHeaders(
        NextResponse.json({
          success: true,
          status: 'pending',
          message: 'Payment successful but balance update pending. Please contact support.',
          data: paymentData,
        })
      );
    }

    // Update user balance
    const newBalance = (userData.balance || 0) + amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Balance update error:', updateError);
      return addCORSHeaders(
        NextResponse.json({
          success: true,
          status: 'pending',
          message: 'Payment successful but balance update pending. Please contact support.',
          data: paymentData,
        })
      );
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: user.id,
      profile_id: userData.id,
      type: 'deposit',
      amount: amount,
      status: 'completed',
      reference: paymentData.reference,
      payment_method: 'paystack',
      payment_channel: paymentData.channel,
      metadata: {
        gateway_response: paymentData.gateway_response,
        paid_at: paymentData.paid_at,
        customer: paymentData.customer,
      },
    });

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        status: 'success',
        message: 'Payment verified and balance updated',
        data: {
          reference: paymentData.reference,
          amount: amount,
          newBalance: newBalance,
          paidAt: paymentData.paid_at,
        },
      })
    );
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to verify payment' },
        { status: 500 }
      )
    );
  }
}
