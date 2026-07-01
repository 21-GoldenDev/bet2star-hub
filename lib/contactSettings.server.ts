import { getServiceClient } from "@/lib/supabase/service";

export const CONTACT_SETTINGS_ID = "general";

export type ContactSettings = {
  email: string;
  phone: string;
};

function normalizeContactSettings(row?: {
  contact_email?: string | null;
  contact_phone?: string | null;
} | null): ContactSettings {
  return {
    email: row?.contact_email?.trim() || "",
    phone: row?.contact_phone?.trim() || "",
  };
}

function isMissingColumnError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function readContactSettings(): Promise<ContactSettings> {
  const service = getServiceClient();
  const { data, error } = await service
    .from("platform_settings")
    .select("contact_email, contact_phone")
    .eq("id", CONTACT_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return { email: "", phone: "" };
    }
    throw error;
  }

  return normalizeContactSettings(data);
}

export async function writeContactSettings(settings: ContactSettings): Promise<ContactSettings> {
  const email = settings.email.trim();
  const phone = settings.phone.trim();
  const service = getServiceClient();

  const { data: updated, error: updateError } = await service
    .from("platform_settings")
    .update({
      contact_email: email,
      contact_phone: phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CONTACT_SETTINGS_ID)
    .select("contact_email, contact_phone");

  if (updateError) {
    if (isMissingColumnError(updateError.message)) {
      throw new Error(
        "Contact settings columns are missing. Run the latest database migration."
      );
    }
    throw updateError;
  }

  if (updated && updated.length > 0) {
    return normalizeContactSettings(updated[0]);
  }

  const { data: inserted, error: insertError } = await service
    .from("platform_settings")
    .insert({
      id: CONTACT_SETTINGS_ID,
      max_bet_amount: 100000,
      contact_email: email,
      contact_phone: phone,
    })
    .select("contact_email, contact_phone")
    .single();

  if (insertError) {
    throw insertError;
  }

  return normalizeContactSettings(inserted);
}

export function hasContactDetails(settings: ContactSettings) {
  return Boolean(settings.email || settings.phone);
}
