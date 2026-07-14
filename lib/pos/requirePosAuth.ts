import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addCORSHeaders } from "@/app/api/middleware/cors";
import { verifyPosToken, type PosTokenPayload } from "@/lib/pos/posToken";

export type PosAuthResult =
  | { ok: true; payload: PosTokenPayload }
  | { ok: false; response: NextResponse };

function extractBearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header) {
    return "";
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

/**
 * Verifies POS Authorization Bearer token and ensures the terminal is still active.
 * Login remains open; call this on all other POS endpoints.
 */
export async function requirePosAuth(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<PosAuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json(
          { error: "Authorization Bearer token is required." },
          { status: 401 },
        ),
      ),
    };
  }

  const payload = verifyPosToken(token);
  if (!payload) {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json(
          { error: "Invalid or expired token." },
          { status: 401 },
        ),
      ),
    };
  }

  const { data: terminal, error } = await supabase
    .from("terminal")
    .select("id, serial_number, status")
    .eq("id", payload.terminal_id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json({ error: error.message }, { status: 500 }),
      ),
    };
  }

  if (!terminal) {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json({ error: "Terminal not found." }, { status: 401 }),
      ),
    };
  }

  if (terminal.serial_number !== payload.serial_number) {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }),
      ),
    };
  }

  if (terminal.status !== "active") {
    return {
      ok: false,
      response: addCORSHeaders(
        NextResponse.json({ error: "Terminal is inactive." }, { status: 401 }),
      ),
    };
  }

  return { ok: true, payload };
}
