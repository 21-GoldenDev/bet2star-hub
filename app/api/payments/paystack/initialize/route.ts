import { NextRequest, NextResponse } from 'next/server';
import { initializePayment, generatePaymentReference, toKobo } from '@/lib/payments/paystack';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount } = body;

    // Validate inputs
    if (!email || !amount) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Email and amount are required' },
          { status: 400 }
        )
      );
    }

    if (amount < 100) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Minimum amount is ₦100' },
          { status: 400 }
        )
      );
    }

    // Get current user from session
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

    // Verify email matches
    if (user.email !== email) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Email does not match authenticated user' },
          { status: 400 }
        )
      );
    }

    // Generate unique reference
    const reference = generatePaymentReference('DEP');

    // Initialize payment with Paystack
    const result = await initializePayment({
      email,
      amount: toKobo(amount),
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-status?reference=${reference}`,
      metadata: {
        type: 'deposit',
      },
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    });

    if (!result.success) {
      return addCORSHeaders(
        NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      );
    }

    // Create pending transaction record
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: amount,
      status: 'pending',
      reference: reference,
      payment_method: 'paystack',
      metadata: {
        type: 'deposit',
      },
    });

    if (txError) {
      console.error('Transaction record error:', txError);
      // Don't fail the request - transaction was already initialized with Paystack
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: result.data,
      })
    );
  } catch (error: any) {
    console.error('Initialize payment error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to initialize payment' },
        { status: 500 }
      )
    );
  }
}
