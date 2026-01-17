import { NextRequest, NextResponse } from 'next/server';
import { getBanks } from '@/lib/payments/paystack';
import { addCORSHeaders, handleCORS } from '@/app/api/middleware/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country') || 'nigeria';

    const result = await getBanks(country);

    if (!result.success) {
      return addCORSHeaders(
        NextResponse.json(
          { error: result.error },
          { status: 500 }
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
    console.error('Get banks error:', error);
    return addCORSHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to fetch banks' },
        { status: 500 }
      )
    );
  }
}
