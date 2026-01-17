/**
 * Paystack Payment Integration Library
 * Provides utilities for payment processing, verification, and transfers
 */

import Paystack from 'paystack';

// Initialize Paystack with secret key
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY!);

export interface InitializePaymentParams {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  name?: string;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
  currency?: string;
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, any> | null;
      risk_action: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

export interface TransferRecipientParams {
  type: 'nuban' | 'mobile_money' | 'basa';
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}

export interface InitiateTransferParams {
  source: string;
  amount: number;
  recipient: string;
  reason?: string;
  reference?: string;
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment(params: InitializePaymentParams) {
  try {
    const response = await paystack.transaction.initialize({
      email: params.email,
      amount: params.amount,
      name: params.name || params.email.split('@')[0],
      reference: params.reference || "",
      callback_url: params.callback_url,
      metadata: params.metadata,
      channels: params.channels,
      currency: params.currency || 'NGN',
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize payment',
    };
  }
}

/**
 * Verify a payment transaction
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  try {
    const response = await paystack.transaction.verify(reference);
    return response as VerifyPaymentResponse;
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    throw new Error(error.message || 'Failed to verify payment');
  }
}

/**
 * Get list of supported banks
 */
export async function getBanks(country: string = 'nigeria') {
  try {
    const response = await paystack.misc.list_banks({ perPage: 100, page: 1 } as any);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Paystack get banks error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch banks',
    };
  }
}

/**
 * Resolve account number to get account name
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string
) {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to resolve account');
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Paystack resolve account error:', error);
    return {
      success: false,
      error: error.message || 'Failed to resolve account',
    };
  }
}

/**
 * Create a transfer recipient
 */
export async function createTransferRecipient(params: TransferRecipientParams) {
  try {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || 'NGN',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to create recipient');
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Paystack create recipient error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create transfer recipient',
    };
  }
}

/**
 * Initiate a transfer
 */
export async function initiateTransfer(params: InitiateTransferParams) {
  try {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: params.source,
        amount: params.amount,
        recipient: params.recipient,
        reason: params.reason,
        reference: params.reference,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to initiate transfer');
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Paystack transfer error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate transfer',
    };
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * Generate unique payment reference
 */
export function generatePaymentReference(prefix: string = 'PAY'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Convert amount to kobo (smallest currency unit)
 * Paystack expects amounts in kobo (1 Naira = 100 kobo)
 */
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert amount from kobo to Naira
 */
export function fromKobo(amount: number): number {
  return amount / 100;
}

export default paystack;
