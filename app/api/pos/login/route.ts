import { NextRequest, NextResponse } from "next/server";
import { handleCORS } from "@/app/api/middleware/cors";
import { authenticatePosLogin } from "@/lib/pos/posLogin";
import { parsePosInput, pickString } from "@/lib/pos/parsePosInput";
import { posErrorResponse, posSuccess } from "@/lib/pos/posErrors";
import { getServiceClient } from "@/lib/supabase/service";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const input = await parsePosInput(request);
    const serialNumber = pickString(
      input,
      "serial_number",
      "serialNumber",
      "tsn",
      "TSN",
    );
    const password = pickString(input, "password", "pin");

    const supabase = getServiceClient();
    const result = await authenticatePosLogin(supabase, serialNumber, password);
    return posSuccess(result);
  } catch (error: unknown) {
    return posErrorResponse(error);
  }
}
