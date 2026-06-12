import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validateHierarchyPassword } from "./hierarchyPassword";

export type HierarchyAuthRole = "staff" | "agent";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to provision hierarchy auth users.");
  }
  return createClient(url, key);
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find(
      (user) => typeof user.email === "string" && user.email.toLowerCase() === normalizedEmail
    );
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

export async function provisionHierarchyAuthUser({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role: HierarchyAuthRole;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = String(password || "");
  if (!normalizedEmail || !normalizedPassword) {
    return;
  }

  const passwordError = validateHierarchyPassword(normalizedPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const supabase = getServiceClient();
  const authUser = await findAuthUserByEmail(supabase, normalizedEmail);
  const userMetadata = { role };

  if (authUser) {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error) {
    throw error;
  }
}
