import supabase from "./supabase/client";

async function createUserProfile(userId: string, profileData: { username?: string; full_name?: string; phone?: string; avatar?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ user_id: userId, ...profileData }]);
  return { data, error };
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

async function updateUserProfile(userId: string, updates: { username?: string; full_name?: string; phone?: string; avatar?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, any>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  });
  if (error || !data.user) {
    return { data, error };
  }
  await createUserProfile(data.user.id, metadata || {});
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error) {
    return { data, error };
  }

  try {
    const fallbackResponse = await fetch("/api/auth/legacy-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (fallbackResponse.ok) {
      return await supabase.auth.signInWithPassword({ email, password });
    }

    const fallbackData = await fallbackResponse.json().catch(() => null);
    return {
      data: null,
      error: new Error(fallbackData?.error || error.message || "Login failed"),
    };
  } catch (fallbackError: any) {
    return {
      data: null,
      error: new Error(fallbackError?.message || error.message || "Login failed"),
    };
  }
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
  if (data?.user) {
    const profile = await getUserProfile(data.user.id);
    return {
      data: { user: data.user, profile: profile.data },
      error: profile.error || error
    };
  }
  return { data, error };
}

export async function updateAuthUser(updates: { phone?: string | null; full_name?: string | null; avatar?: string | null }) {
  const phone = updates.phone ?? undefined;
  const data: Record<string, any> = {};
  if (updates.full_name !== undefined) data.full_name = updates.full_name;
  if (updates.phone !== undefined) data.phone = updates.phone;
  if (updates.avatar !== undefined) data.avatar = updates.avatar;
  const { data: user } = await getUser();
  if (!user?.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  const result = await updateUserProfile(user.user.id, data);
  return { data: result.data, error: result.error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}
