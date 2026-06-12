"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAdminRole from "@/hooks/use-admin-role";

export default function BettingAccessGate() {
  const router = useRouter();
  const { roleInfo, loadingRole } = useAdminRole();

  useEffect(() => {
    if (!loadingRole && roleInfo?.role === "staff") {
      router.replace("/admin/agents");
    } else if (!loadingRole && roleInfo?.role === "agent") {
      router.replace("/admin/terminals");
    }
  }, [loadingRole, roleInfo, router]);

  return null;
}
