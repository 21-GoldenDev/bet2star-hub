import supabase from "./supabaseClient";

export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, any>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const { data: { session: _ } } = await supabase.auth.getSession();
  return { data, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

export async function updateAuthUser(updates: { phone?: string | null; full_name?: string | null; avatar?: string | null }) {
  const phone = updates.phone ?? undefined;
  const data: Record<string, any> = {};
  if (updates.full_name !== undefined) data.full_name = updates.full_name;
  if (updates.avatar !== undefined) data.avatar = updates.avatar;
  const result = await supabase.auth.updateUser({ phone, data });
  return { data: result.data, error: result.error };
}
