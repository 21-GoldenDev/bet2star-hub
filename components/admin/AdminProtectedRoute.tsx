"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSupabaseUser from "@/hooks/use-supabase-user";
import Loading from "@/components/Loading";
import { isUserAdminByEmail } from "@/lib/admin/auth";

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSupabaseUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      setChecking(true);
      if (!isLoading && user) {
        const adminStatus = await isUserAdminByEmail(user.email || "");
        if (!adminStatus) {
          router.push("/");
        }
      } else if (!isLoading && !user) {
        router.push("/auth");
      }
      setChecking(false);
    };

    checkAdmin();
  }, [isLoading, user, router]);

  if (isLoading || checking) {
    return <Loading />;
  }

  return <>{children}</>;
}
