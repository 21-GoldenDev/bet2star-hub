import { NextRequest, NextResponse } from "next/server";
import { addCORSHeaders, handleCORS } from "@/app/api/middleware/cors";
import { authenticatePosLogin } from "@/lib/pos/posLogin";
import { parsePosInput, pickString } from "@/lib/pos/parsePosInput";
import { getServiceClient } from "@/lib/supabase/service";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request) || new NextResponse(null, { status: 200 });
}

async function handleLoginRequest(request: NextRequest) {
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

    return addCORSHeaders(
      NextResponse.json({
        success: true,
        data: result,
      }),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    const status =
      message.includes("Invalid serial number") ||
      message.includes("inactive")
        ? 401
        : message.includes("required")
          ? 400
          : 500;

    return addCORSHeaders(
      NextResponse.json({ error: message }, { status }),
    );
  }
}

export async function GET(request: NextRequest) {
  return handleLoginRequest(request);
}

export async function POST(request: NextRequest) {
  return handleLoginRequest(request);
}
