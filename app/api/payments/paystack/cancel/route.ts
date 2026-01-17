import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function PUT(request: NextRequest) {
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

    const supabase = await createSupabaseServer();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      );
    }

    // Update transaction status to cancelled
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('reference', reference)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Error cancelling transaction:', updateError);
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Failed to cancel transaction' },
          { status: 500 }
        )
      );
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        message: 'Transaction cancelled',
      })
    );
  } catch (error: any) {
    console.error('Cancel transaction error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to cancel transaction' },
        { status: 500 }
      )
    );
  }
}
