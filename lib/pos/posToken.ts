import crypto from "crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type PosTokenPayload = {
  terminal_id: string;
  serial_number: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.POS_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "POS_TOKEN_SECRET is required. Set a dedicated secret; do not use SUPABASE_SERVICE_ROLE_KEY for POS tokens.",
    );
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createPosToken(terminalId: string, serialNumber: string): string {
  const payload: PosTokenPayload = {
    terminal_id: terminalId,
    serial_number: serialNumber,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyPosToken(token: string): PosTokenPayload | null {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) {
      return null;
    }

    const expected = sign(encoded);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as PosTokenPayload;

    if (
      !payload.terminal_id ||
      !payload.serial_number ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
