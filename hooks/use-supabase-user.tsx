"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (mounted) setUser(u ?? null);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return { user };
}

export default useSupabaseUser;
