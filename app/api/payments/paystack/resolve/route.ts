import { NextRequest, NextResponse } from 'next/server';
import { resolveAccountNumber } from '@/lib/payments/paystack';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return addCORSHeaders(
        NextResponse.json(
          { error: 'Account number and bank code are required' },
          { status: 400 }
        )
      );
    }

    const result = await resolveAccountNumber(accountNumber, bankCode);

    if (!result.success) {
      return addCORSHeaders(
        NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      );
    }

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: result.data,
      })
    );
  } catch (error: any) {
    console.error('Resolve account error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to resolve account' },
        { status: 500 }
      )
    );
  }
}
