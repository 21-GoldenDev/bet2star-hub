import { getServiceClient } from "@/lib/supabase/service";
import {
  emptyDepositBankDetails,
  type DepositBankDetails,
} from "@/lib/depositBankDetails.shared";

export const DEPOSIT_BANK_BUCKET = "platform-config";
export const DEPOSIT_BANK_CONFIG_PATH = "deposit-bank.json";
export const DEPOSIT_SETTINGS_ID = "general";

export type { DepositBankDetails };

function normalizeDepositBankDetailsJson(value: unknown): DepositBankDetails {
  if (!value || typeof value !== "object") {
    return { ...emptyDepositBankDetails };
  }

  const row = value as Record<string, unknown>;
  return {
    bankName: typeof row.bankName === "string" ? row.bankName.trim() : "",
    accountNumber: typeof row.accountNumber === "string" ? row.accountNumber.trim() : "",
    accountName: typeof row.accountName === "string" ? row.accountName.trim() : "",
    note: typeof row.note === "string" ? row.note.trim() : "",
  };
}

function normalizeDepositBankDetails(row?: {
  deposit_bank_name?: string | null;
  deposit_account_number?: string | null;
  deposit_account_name?: string | null;
  deposit_note?: string | null;
} | null): DepositBankDetails {
  return {
    bankName: row?.deposit_bank_name?.trim() || "",
    accountNumber: row?.deposit_account_number?.trim() || "",
    accountName: row?.deposit_account_name?.trim() || "",
    note: row?.deposit_note?.trim() || "",
  };
}

function isMissingColumnError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

function isMissingBucketError(message: string) {
  return message.includes("Bucket not found") || message.includes("not found");
}

async function ensureDepositBankBucket() {
  const service = getServiceClient();
  const { data: buckets, error: listError } = await service.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  const exists = (buckets || []).some(
    (bucket) => bucket.name === DEPOSIT_BANK_BUCKET || bucket.id === DEPOSIT_BANK_BUCKET
  );
  if (exists) {
    return;
  }

  const { error: createError } = await service.storage.createBucket(DEPOSIT_BANK_BUCKET, {
    public: false,
    fileSizeLimit: 1048576,
    allowedMimeTypes: ["application/json"],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function readDepositBankDetailsFromDb(): Promise<DepositBankDetails | null> {
  const service = getServiceClient();
  const { data, error } = await service
    .from("platform_settings")
    .select("deposit_bank_name, deposit_account_number, deposit_account_name, deposit_note")
    .eq("id", DEPOSIT_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return null;
    }
    throw error;
  }

  return normalizeDepositBankDetails(data);
}

async function writeDepositBankDetailsToDb(details: DepositBankDetails) {
  const service = getServiceClient();
  const { data: updated, error: updateError } = await service
    .from("platform_settings")
    .update({
      deposit_bank_name: details.bankName,
      deposit_account_number: details.accountNumber,
      deposit_account_name: details.accountName,
      deposit_note: details.note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", DEPOSIT_SETTINGS_ID)
    .select("id");

  if (updateError) {
    if (isMissingColumnError(updateError.message)) {
      return false;
    }
    throw updateError;
  }

  if (updated && updated.length > 0) {
    return true;
  }

  const { error: insertError } = await service.from("platform_settings").insert({
    id: DEPOSIT_SETTINGS_ID,
    max_bet_amount: 100000,
    deposit_bank_name: details.bankName,
    deposit_account_number: details.accountNumber,
    deposit_account_name: details.accountName,
    deposit_note: details.note,
  });

  if (insertError) {
    if (isMissingColumnError(insertError.message)) {
      return false;
    }
    throw insertError;
  }

  return true;
}

export async function readDepositBankDetails(): Promise<DepositBankDetails> {
  const service = getServiceClient();

  try {
    await ensureDepositBankBucket();
  } catch (error) {
    console.warn("Could not ensure deposit bank bucket:", error);
  }

  const { data: file, error: storageError } = await service.storage
    .from(DEPOSIT_BANK_BUCKET)
    .download(DEPOSIT_BANK_CONFIG_PATH);

  if (!storageError && file) {
    try {
      const parsed = JSON.parse(await file.text());
      return normalizeDepositBankDetailsJson(parsed);
    } catch {
      return { ...emptyDepositBankDetails };
    }
  }

  if (
    storageError &&
    !isMissingBucketError(storageError.message) &&
    storageError.message !== "Object not found"
  ) {
    console.warn("Deposit bank storage read error:", storageError.message);
  }

  const fromDb = await readDepositBankDetailsFromDb();
  if (fromDb) {
    return fromDb;
  }

  return { ...emptyDepositBankDetails };
}

export async function writeDepositBankDetails(details: DepositBankDetails) {
  const service = getServiceClient();
  const payload = Buffer.from(
    JSON.stringify({
      bankName: details.bankName,
      accountNumber: details.accountNumber,
      accountName: details.accountName,
      note: details.note,
      updatedAt: new Date().toISOString(),
    })
  );

  await ensureDepositBankBucket();

  const { error: storageError } = await service.storage
    .from(DEPOSIT_BANK_BUCKET)
    .upload(DEPOSIT_BANK_CONFIG_PATH, payload, {
      contentType: "application/json",
      upsert: true,
    });

  if (!storageError) {
    return details;
  }

  const savedToDb = await writeDepositBankDetailsToDb(details);
  if (savedToDb) {
    return details;
  }

  throw new Error(
    `Could not save bank details: ${storageError.message}. Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment.`
  );
}
