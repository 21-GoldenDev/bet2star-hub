"use client";

import { useEffect, useState } from "react";

export type AdminRole = "admin" | "staff" | "agent" | "unknown";

export interface AdminRoleInfo {
  role: AdminRole;
  id?: string;
  staff_id?: string;
}

export default function useAdminRole() {
  const [roleInfo, setRoleInfo] = useState<AdminRoleInfo | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch("/api/admin/me");
        const data = await response.json();
        if (response.ok && data.role) {
          setRoleInfo({
            role: data.role,
            id: data.id,
            staff_id: data.staff_id,
          });
        } else {
          setRoleInfo({ role: "unknown" });
        }
      } catch (error) {
        setRoleInfo({ role: "unknown" });
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();
  }, []);

  return { roleInfo, loadingRole };
}
