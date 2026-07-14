import { NextResponse } from "next/server";
import { addCORSHeaders } from "@/app/api/middleware/cors";

export const POS_ERROR_CODES = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TERMINAL_INACTIVE: "TERMINAL_INACTIVE",
  AGENT_INACTIVE: "AGENT_INACTIVE",
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  SERIAL_MISMATCH: "SERIAL_MISMATCH",
  PRODUCT_NOT_ALLOWED: "PRODUCT_NOT_ALLOWED",
  INSUFFICIENT_CREDIT: "INSUFFICIENT_CREDIT",
  MAX_STAKE_EXCEEDED: "MAX_STAKE_EXCEEDED",
  NO_ACTIVE_GAME: "NO_ACTIVE_GAME",
  GAME_NOT_ACTIVE: "GAME_NOT_ACTIVE",
  GAME_NOT_FOUND: "GAME_NOT_FOUND",
  INVALID_MODE: "INVALID_MODE",
  INVALID_STAKE: "INVALID_STAKE",
  INVALID_SELECTIONS: "INVALID_SELECTIONS",
  MATCH_UNAVAILABLE: "MATCH_UNAVAILABLE",
  PRIZE_INACTIVE: "PRIZE_INACTIVE",
  TERMINAL_NOT_FOUND: "TERMINAL_NOT_FOUND",
  CREDIT_DEDUCT_FAILED: "CREDIT_DEDUCT_FAILED",
  BET_SAVE_FAILED: "BET_SAVE_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type PosErrorCode = (typeof POS_ERROR_CODES)[keyof typeof POS_ERROR_CODES];

const DEFAULT_STATUS: Record<PosErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_CREDENTIALS: 401,
  TERMINAL_INACTIVE: 401,
  AGENT_INACTIVE: 401,
  TOKEN_REQUIRED: 401,
  TOKEN_INVALID: 401,
  SERIAL_MISMATCH: 403,
  PRODUCT_NOT_ALLOWED: 403,
  INSUFFICIENT_CREDIT: 400,
  MAX_STAKE_EXCEEDED: 400,
  NO_ACTIVE_GAME: 404,
  GAME_NOT_ACTIVE: 400,
  GAME_NOT_FOUND: 404,
  INVALID_MODE: 400,
  INVALID_STAKE: 400,
  INVALID_SELECTIONS: 400,
  MATCH_UNAVAILABLE: 400,
  PRIZE_INACTIVE: 400,
  TERMINAL_NOT_FOUND: 404,
  CREDIT_DEDUCT_FAILED: 500,
  BET_SAVE_FAILED: 500,
  INTERNAL_ERROR: 500,
};

export class PosError extends Error {
  code: PosErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: PosErrorCode,
    message: string,
    details?: Record<string, unknown>,
    status?: number,
  ) {
    super(message);
    this.name = "PosError";
    this.code = code;
    this.status = status ?? DEFAULT_STATUS[code] ?? 400;
    this.details = details;
  }
}

export function posErrorResponse(error: unknown): NextResponse {
  if (error instanceof PosError) {
    return addCORSHeaders(
      NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
        { status: error.status },
      ),
    );
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  const mapped = mapLegacyMessage(message);
  if (mapped) {
    return posErrorResponse(mapped);
  }

  return addCORSHeaders(
    NextResponse.json(
      {
        success: false,
        error: {
          code: POS_ERROR_CODES.INTERNAL_ERROR,
          message,
        },
      },
      { status: 500 },
    ),
  );
}

function mapLegacyMessage(message: string): PosError | null {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient terminal credit") || lower.includes("insufficient credit")) {
    return new PosError(POS_ERROR_CODES.INSUFFICIENT_CREDIT, message);
  }
  if (lower.includes("maximum stake")) {
    return new PosError(POS_ERROR_CODES.MAX_STAKE_EXCEEDED, message);
  }
  if (lower.includes("no active")) {
    return new PosError(POS_ERROR_CODES.NO_ACTIVE_GAME, message);
  }
  if (lower.includes("is not active") && lower.includes("game")) {
    return new PosError(POS_ERROR_CODES.GAME_NOT_ACTIVE, message);
  }
  if (lower.includes("game not found")) {
    return new PosError(POS_ERROR_CODES.GAME_NOT_FOUND, message);
  }
  if (lower.includes("terminal is inactive")) {
    return new PosError(POS_ERROR_CODES.TERMINAL_INACTIVE, message);
  }
  if (lower.includes("not allowed to place")) {
    return new PosError(POS_ERROR_CODES.PRODUCT_NOT_ALLOWED, message);
  }
  if (lower.includes("terminal not found")) {
    return new PosError(POS_ERROR_CODES.TERMINAL_NOT_FOUND, message);
  }
  if (lower.includes("prize is inactive")) {
    return new PosError(POS_ERROR_CODES.PRIZE_INACTIVE, message);
  }
  if (lower.includes("invalid or missing") && lower.includes("mode")) {
    return new PosError(POS_ERROR_CODES.INVALID_MODE, message);
  }
  if (lower.includes("invalid stake")) {
    return new PosError(POS_ERROR_CODES.INVALID_STAKE, message);
  }
  if (lower.includes("draw (d)") || lower.includes("invalid selections") || lower.includes("requires")) {
    return new PosError(POS_ERROR_CODES.INVALID_SELECTIONS, message);
  }
  if (
    lower.includes("unavailable") ||
    lower.includes("has expired") ||
    lower.includes("has been processed") ||
    lower.includes("is inactive")
  ) {
    return new PosError(POS_ERROR_CODES.MATCH_UNAVAILABLE, message);
  }
  if (lower.includes("serial number does not match")) {
    return new PosError(POS_ERROR_CODES.SERIAL_MISMATCH, message);
  }
  if (lower.includes("bearer token is required")) {
    return new PosError(POS_ERROR_CODES.TOKEN_REQUIRED, message);
  }
  if (lower.includes("invalid or expired token")) {
    return new PosError(POS_ERROR_CODES.TOKEN_INVALID, message);
  }
  if (lower.includes("invalid serial number or password")) {
    return new PosError(POS_ERROR_CODES.INVALID_CREDENTIALS, message);
  }
  return null;
}

export function posSuccess(data: unknown, status = 200): NextResponse {
  return addCORSHeaders(
    NextResponse.json({ success: true, data }, { status }),
  );
}
