import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export type AdminRole = "admin" | "staff" | "agent";

export interface AdminRoleInfo {
  role: AdminRole;
  id?: string;
  staff_id?: string;
}

const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase())
  : [];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin role resolution.");
  }
  return createClient(url, key);
}

export async function resolveAdminRoleByEmail(email: string): Promise<AdminRoleInfo | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  if (adminEmails.includes(normalizedEmail)) {
    return { role: "admin" };
  }

  const service = getServiceClient();

  const { data: staffData, error: staffError } = await service
    .from("staff")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (staffData) {
    return { role: "staff", id: staffData.id };
  }

  const { data: agentData, error: agentError } = await service
    .from("agent")
    .select("id, staff_id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  if (agentData) {
    return { role: "agent", id: agentData.id, staff_id: agentData.staff_id };
  }

  return null;
}

export async function getAdminRoleFromRequest(request: NextRequest): Promise<AdminRoleInfo | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email) {
    return null;
  }

  const metadataRole = data.user.user_metadata?.role;
  if (metadataRole === "staff" || metadataRole === "agent") {
    const service = getServiceClient();
    const normalizedEmail = data.user.email.trim().toLowerCase();

    if (metadataRole === "staff") {
      const { data: staffData, error: staffError } = await service
        .from("staff")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      if (staffError) {
        throw staffError;
      }
      if (staffData) {
        return { role: "staff", id: staffData.id };
      }
    }

    if (metadataRole === "agent") {
      const { data: agentData, error: agentError } = await service
        .from("agent")
        .select("id, staff_id")
        .ilike("email", normalizedEmail)
        .maybeSingle();
      if (agentError) {
        throw agentError;
      }
      if (agentData) {
        return { role: "agent", id: agentData.id, staff_id: agentData.staff_id };
      }
    }
  }

  return await resolveAdminRoleByEmail(data.user.email);
}

export async function getManagedTerminalIds(roleInfo: AdminRoleInfo) {
  if (roleInfo.role === "admin") {
    return null;
  }

  const service = getServiceClient();

  if (roleInfo.role === "agent") {
    if (!roleInfo.id) {
      return [];
    }

    const { data: terminals, error } = await service
      .from("terminal")
      .select("id")
      .eq("agent_id", roleInfo.id);

    if (error) {
      throw error;
    }

    return (terminals || []).map((t: any) => t.id).filter((id: string) => id && id !== "null" && id !== "undefined");
  }

  if (roleInfo.role === "staff") {
    if (!roleInfo.id) {
      return [];
    }

    const { data: agents, error: agentsError } = await service
      .from("agent")
      .select("id")
      .eq("staff_id", roleInfo.id);

    if (agentsError) {
      throw agentsError;
    }

    const agentIds = (agents || []).map((agent: any) => agent.id).filter((id: string) => id && id !== "null" && id !== "undefined");
    if (agentIds.length === 0) {
      return [];
    }

    const { data: terminals, error: terminalsError } = await service
      .from("terminal")
      .select("id")
      .in("agent_id", agentIds);

    if (terminalsError) {
      throw terminalsError;
    }

    return (terminals || []).map((t: any) => t.id);
  }

  return [];
}

export async function getManagedPlayerIds(terminalIds: string[]) {
  if (!terminalIds || terminalIds.length === 0) {
    return [];
  }

  const validTerminalIds = terminalIds.filter((id) => id && id !== "null" && id !== "undefined");
  if (validTerminalIds.length === 0) {
    return [];
  }

  const service = getServiceClient();
  const betsTables = ["bets_lotto", "bets_pools", "bets_sport", "bets_sports_draw"];
  const playerIds = new Set<string>();
  console.log("Fetching player IDs for terminals:", validTerminalIds);

  await Promise.all(
    betsTables.map(async (table) => {
      const { data, error } = await service
        .from(table)
        .select("player")
        .in("terminal", validTerminalIds)
        .neq("player", null);

      if (error) {
        throw error;
      }

      (data || []).forEach((row: any) => {
        if (typeof row.player === "string") {
          playerIds.add(row.player);
        }
      });
    })
  );

  return Array.from(playerIds);
}
