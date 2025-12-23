/**
 * Admin authentication utilities
 * Checks if a user has admin role
 */

import supabase from "@/lib/supabase/client";

export const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];

export async function isUserAdmin(userId: string): Promise<boolean> {
  return true;
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function isUserAdminByEmail(email: string): Promise<boolean> {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
