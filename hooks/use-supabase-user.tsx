"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
          setUser(u ?? null);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}

export default useSupabaseUser;
