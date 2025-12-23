"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/client";
import { getUserProfile } from "@/lib/auth";

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  full_name: string | null;
  avatar: string | null;
  created_at: string;
}

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (mounted) {
          if (u) {
            try {
              const { data: profile } = await getUserProfile(u.id);
              setUser({
                id: u.id,
                email: u.email || null,
                phone: profile?.phone || null,
                username: profile?.username || null,
                full_name: profile?.full_name || null,
                avatar: profile?.avatar || null,
                created_at: u.created_at,
              });
              setIsLoading(false);
            } catch (error) {
              console.error("Error fetching user profile:", error);
              setUser(null);
              setIsLoading(false);
            }
          } else {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, isLoading };
}

export default useSupabaseUser;
