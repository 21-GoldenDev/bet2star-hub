"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { isUserAdminByEmail } from "@/lib/admin/auth";
import supabase from "@/lib/supabase/client";

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      setChecking(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const adminStatus = await isUserAdminByEmail(user.email || "");
          if (!adminStatus) {
            router.push("/");
          }
        } else {
          router.push("/auth");
        }
      } catch (e) {
        console.error("Failed to get user details:", e);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (checking) {
    return <Loading />;
  }

  return <>{children}</>;
}
