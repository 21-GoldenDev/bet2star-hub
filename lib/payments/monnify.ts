/**
 * Monnify payment integration — deposits (collections) only.
 * Auth, initialize, verify, and webhook signature helpers.
 */

import crypto from "crypto";

const DEFAULT_BASE_URL = "https://sandbox.monnify.com";

function getBaseUrl() {
  return (process.env.MONNIFY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getCredentials() {
  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;

  if (!apiKey || !secretKey || !contractCode) {
    throw new Error(
      "Monnify credentials missing. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE."
    );
  }

  return { apiKey, secretKey, contractCode };
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Authenticate with Monnify (Basic apiKey:secretKey → Bearer accessToken).
 * Tokens last ~1 hour; we refresh 60s early.
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const { apiKey, secretKey } = getCredentials();
  const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  const response = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok || !payload?.requestSuccessful) {
    throw new Error(
      payload?.responseMessage || "Failed to authenticate with Monnify"
    );
  }

  const accessToken = payload.responseBody.accessToken as string;
  const expiresIn = Number(payload.responseBody.expiresIn || 3600);

  cachedToken = {
    accessToken,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };

  return accessToken;
}

export interface InitializeMonnifyPaymentParams {
  email: string;
  amount: number; // Naira
  name?: string;
  paymentReference: string;
  redirectUrl?: string;
  paymentDescription?: string;
  paymentMethods?: string[];
  metaData?: Record<string, unknown>;
}

export async function initializePayment(params: InitializeMonnifyPaymentParams) {
  try {
    const { contractCode } = getCredentials();
    const accessToken = await getAccessToken();

    const body = {
      amount: params.amount,
      customerName: params.name || params.email.split("@")[0],
      customerEmail: params.email,
      paymentReference: params.paymentReference,
      paymentDescription:
        params.paymentDescription || "Wallet deposit",
      currencyCode: "NGN",
      contractCode,
      redirectUrl: params.redirectUrl,
      paymentMethods: params.paymentMethods || [
        "CARD",
        "ACCOUNT_TRANSFER",
        "USSD",
        "PHONE_NUMBER",
      ],
      metaData: params.metaData,
    };

    const response = await fetch(
      `${getBaseUrl()}/api/v1/merchant/transactions/init-transaction`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const payload = await response.json();

    if (!response.ok || !payload?.requestSuccessful) {
      return {
        success: false as const,
        error:
          payload?.responseMessage || "Failed to initialize Monnify payment",
      };
    }

    return {
      success: true as const,
      data: payload.responseBody as {
        transactionReference: string;
        paymentReference: string;
        merchantName: string;
        apiKey: string;
        checkoutUrl: string;
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize payment";
    console.error("Monnify initialization error:", error);
    return { success: false as const, error: message };
  }
}

export interface MonnifyTransactionStatus {
  paymentReference: string;
  transactionReference: string;
  paymentStatus: string;
  amountPaid: number;
  amount: number;
  paidOn?: string;
  paymentMethod?: string;
  currency?: string;
  customer?: {
    email?: string;
    name?: string;
  };
  [key: string]: unknown;
}

/**
 * Query transaction status by merchant paymentReference.
 */
export async function verifyPayment(
  paymentReference: string
): Promise<{
  status: boolean;
  message: string;
  data: MonnifyTransactionStatus | null;
}> {
  try {
    const accessToken = await getAccessToken();
    // v2 is the current query API; fall back handled by caller if needed
    const url = new URL(
      `${getBaseUrl()}/api/v2/merchant/transactions/query`
    );
    url.searchParams.set("paymentReference", paymentReference);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const payload = await response.json();

    if (!response.ok || !payload?.requestSuccessful) {
      return {
        status: false,
        message: payload?.responseMessage || "Failed to verify payment",
        data: null,
      };
    }

    return {
      status: true,
      message: payload.responseMessage || "success",
      data: payload.responseBody as MonnifyTransactionStatus,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    console.error("Monnify verification error:", error);
    throw new Error(message);
  }
}

/**
 * HMAC-SHA512 of the raw webhook body with the client secret.
 * Note: monnify-signature is only sent in production (not sandbox).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) {
    // Sandbox webhooks omit the signature header.
    const base = getBaseUrl();
    return base.includes("sandbox");
  }

  const { secretKey } = getCredentials();
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

export function isPaymentPaid(status: string | undefined | null): boolean {
  return (status || "").toUpperCase() === "PAID";
}

export { generatePaymentReference } from "@/lib/payments/reference";
