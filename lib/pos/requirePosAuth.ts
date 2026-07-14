import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyPosToken, type PosTokenPayload } from "@/lib/pos/posToken";
import { PosError, POS_ERROR_CODES, posErrorResponse } from "@/lib/pos/posErrors";

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
      response: posErrorResponse(
        new PosError(
          POS_ERROR_CODES.TOKEN_REQUIRED,
          "Authorization Bearer token is required.",
        ),
      ),
    };
  }

  let payload;
  try {
    payload = verifyPosToken(token);
  } catch (error) {
    return {
      ok: false,
      response: posErrorResponse(
        new PosError(
          POS_ERROR_CODES.INTERNAL_ERROR,
          error instanceof Error ? error.message : "Token verification failed",
        ),
      ),
    };
  }

  if (!payload) {
    return {
      ok: false,
      response: posErrorResponse(
        new PosError(POS_ERROR_CODES.TOKEN_INVALID, "Invalid or expired token."),
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
      response: posErrorResponse(
        new PosError(POS_ERROR_CODES.INTERNAL_ERROR, error.message),
      ),
    };
  }

  if (!terminal) {
    return {
      ok: false,
      response: posErrorResponse(
        new PosError(POS_ERROR_CODES.TERMINAL_NOT_FOUND, "Terminal not found."),
      ),
    };
  }

  if (terminal.serial_number !== payload.serial_number) {
    return {
      ok: false,
      response: posErrorResponse(
        new PosError(POS_ERROR_CODES.TOKEN_INVALID, "Invalid or expired token."),
      ),
    };
  }

  if (terminal.status !== "active") {
    return {
      ok: false,
      response: posErrorResponse(
        new PosError(POS_ERROR_CODES.TERMINAL_INACTIVE, "Terminal is inactive."),
      ),
    };
  }

  return { ok: true, payload };
}
