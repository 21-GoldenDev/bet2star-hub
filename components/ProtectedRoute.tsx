"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSupabaseUser from "@/hooks/use-supabase-user";
import Loading from "./Loading";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === "/") return;
    if (!isLoading && user === null) {
      router.push(`/auth?redirectTo=${currentPath}`);
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <Loading />
    );
  }

  return <>{children}</>;
}
