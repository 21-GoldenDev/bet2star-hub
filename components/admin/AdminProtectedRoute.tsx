"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import supabase from "@/lib/supabase/client";

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      setChecking(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }

        const response = await fetch("/api/admin/me");
        if (!response.ok) {
          router.push("/");
          return;
        }

        const data = await response.json();
        if (!data?.role) {
          router.push("/");
          return;
        }

        if (pathname === "/admin" || pathname === "/admin/") {
          if (data.role === "staff") {
            router.replace("/admin/bets/lotto");
            return;
          }
          if (data.role === "agent") {
            router.replace("/admin/bets/lotto");
            return;
          }
        }
      } catch (e) {
        console.error("Failed to resolve admin role:", e);
        router.push("/");
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [pathname, router]);

  if (checking) {
    return <Loading />;
  }

  return <>{children}</>;
}
