import { getServiceClient } from "@/lib/supabase/service";
import {
  createEmptyBankAccount,
  type DepositBankAccount,
  type DepositBankConfig,
} from "@/lib/depositBankDetails.shared";

export const DEPOSIT_BANK_BUCKET = "platform-config";
export const DEPOSIT_BANK_CONFIG_PATH = "deposit-bank.json";
export const DEPOSIT_SETTINGS_ID = "general";

export type { DepositBankAccount, DepositBankConfig };

function normalizeBankAccount(value: unknown, fallbackId?: string): DepositBankAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const bankName = typeof row.bankName === "string" ? row.bankName.trim() : "";
  const accountNumber = typeof row.accountNumber === "string" ? row.accountNumber.trim() : "";
  const accountName = typeof row.accountName === "string" ? row.accountName.trim() : "";
  const note = typeof row.note === "string" ? row.note.trim() : "";
  const id =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : fallbackId || crypto.randomUUID();

  if (!bankName && !accountNumber && !accountName && !note) {
    return null;
  }

  return { id, bankName, accountNumber, accountName, note };
}

function normalizeDepositBankConfigJson(value: unknown): DepositBankConfig {
  if (!value || typeof value !== "object") {
    return { banks: [] };
  }

  const row = value as Record<string, unknown>;

  if (Array.isArray(row.banks)) {
    const banks = row.banks
      .map((bank) => normalizeBankAccount(bank))
      .filter((bank): bank is DepositBankAccount => bank !== null);
    return { banks };
  }

  const legacy = normalizeBankAccount(row);
  return { banks: legacy ? [legacy] : [] };
}

function normalizeDepositBankDetailsFromDb(row?: {
  deposit_bank_name?: string | null;
  deposit_account_number?: string | null;
  deposit_account_name?: string | null;
  deposit_note?: string | null;
} | null): DepositBankConfig {
  const bankName = row?.deposit_bank_name?.trim() || "";
  const accountNumber = row?.deposit_account_number?.trim() || "";
  const accountName = row?.deposit_account_name?.trim() || "";
  const note = row?.deposit_note?.trim() || "";

  if (!bankName && !accountNumber && !accountName) {
    return { banks: [] };
  }

  return {
    banks: [
      {
        id: "legacy",
        bankName,
        accountNumber,
        accountName,
        note,
      },
    ],
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

async function readDepositBankDetailsFromDb(): Promise<DepositBankConfig | null> {
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

  return normalizeDepositBankDetailsFromDb(data);
}

async function writeDepositBankDetailsToDb(config: DepositBankConfig) {
  const first = config.banks[0] || createEmptyBankAccount();
  const service = getServiceClient();
  const { data: updated, error: updateError } = await service
    .from("platform_settings")
    .update({
      deposit_bank_name: first.bankName,
      deposit_account_number: first.accountNumber,
      deposit_account_name: first.accountName,
      deposit_note: first.note,
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
    deposit_bank_name: first.bankName,
    deposit_account_number: first.accountNumber,
    deposit_account_name: first.accountName,
    deposit_note: first.note,
  });

  if (insertError) {
    if (isMissingColumnError(insertError.message)) {
      return false;
    }
    throw insertError;
  }

  return true;
}

export async function readDepositBankDetails(): Promise<DepositBankConfig> {
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
      return normalizeDepositBankConfigJson(parsed);
    } catch {
      return { banks: [] };
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

  return { banks: [] };
}

export async function writeDepositBankDetails(config: DepositBankConfig) {
  const service = getServiceClient();
  const payload = Buffer.from(
    JSON.stringify({
      banks: config.banks,
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
    return config;
  }

  const savedToDb = await writeDepositBankDetailsToDb(config);
  if (savedToDb) {
    return config;
  }

  throw new Error(
    `Could not save bank details: ${storageError.message}. Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment.`
  );
}
